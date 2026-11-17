/**
 * The meeting pipeline — server only, with the service role. When a meeting's notes are in and it
 * has a circle:
 *   1. the agent drafts its tasks (lib/draft-tasks.ts) and puts them on the board as drafts
 *      (needs_review), in the best-matching open project of the circle or the circle's Chores;
 *   2. the notes go to the second brain (lib/second-brain.ts): summary + tasks, no transcript;
 *   3. the circle's leads get the notes by email (lib/notes-email.ts);
 *   4. each step is logged in agent_actions.
 * Running it again adds only tasks that aren't there yet (meeting_action_links), rewrites the note
 * and emails again only when asked.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { fmtTaskWhen } from '@/core/lib/tasks'
import type { ActionItem, MeetingVisibility } from '../types'
import { draftTasks, localDay } from './draft-tasks'
import { itemKey, matchPerson, displayName, type PersonProfile } from './people'
import { buildNote, notePath, saveNote, secondBrainOn } from './second-brain'
import { buildNotesEmail, notesEmailOn, notesRecipients, sendEmails } from './notes-email'

const ACTOR = 'meeting-pipeline'
const OPEN_PROJECT = ['pending', 'backlog', 'in_progress', 'review']
// A run that died (e.g. the Worker was stopped) can be retried after this long
const STALE_MS = 10 * 60_000

export interface PipelineResult {
  ok: boolean
  skipped?: string
  added: number
  by?: 'ai' | 'action-items'
  note?: { url: string } | { error: string } | null
  email?: { sent: number; error?: string } | null
  errors: string[]
}

export async function processMeeting(
  admin: SupabaseClient, meetingId: string,
  opts: { requestedBy: string | null; timeoutMs: number; email: 'auto' | 'again' | 'skip' },
): Promise<PipelineResult> {
  const now = new Date()
  const errors: string[] = []
  const log = (action: string, detail: object, target?: { table: string; id: string }) =>
    admin.from('agent_actions').insert({
      actor: ACTOR, requested_by: opts.requestedBy, action, meeting_id: meetingId,
      target_table: target?.table ?? null, target_id: target?.id ?? null, detail,
    }).then(() => {})

  // Claim the meeting so two runs can't overlap
  const { data: claimed } = await admin.from('meeting_transcripts')
    .update({ processing_started_at: now.toISOString() })
    .eq('id', meetingId).eq('status', 'done').not('circle', 'is', null)
    .or(`processing_started_at.is.null,processing_started_at.lt."${new Date(now.getTime() - STALE_MS).toISOString()}"`)
    .select('id, title, meeting_date, created_at, attendees, summary, action_items, transcript, circle, visibility, notes_emailed_at')
  const m = claimed?.[0]
  if (!m) return { ok: false, skipped: 'Not ready (no notes or no circle yet), or already running', added: 0, errors }

  try {
    const timeZone = process.env.COMMUNITY_TIME_ZONE || 'UTC'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    const circleSlug = m.circle as string
    const items = (m.action_items ?? []) as ActionItem[]

    const [circleRes, projRes, taskRes, peopleRes] = await Promise.all([
      admin.from('circles').select('slug, name').eq('slug', circleSlug).maybeSingle(),
      admin.from('projects').select('id, title, description, status, is_chores').eq('circle', circleSlug).in('status', OPEN_PROJECT),
      admin.from('deliverables').select('title, project_id, projects(title)').eq('circle', circleSlug).neq('status', 'done').limit(200),
      admin.from('user_profiles').select('id, first_name, last_name, username'),
    ])
    const circle = { slug: circleSlug, name: (circleRes.data?.name as string | undefined) ?? circleSlug }
    const projects = (projRes.data ?? []).filter(p => !p.is_chores).map(p => ({ id: p.id as string, title: p.title as string, description: p.description as string | null }))
    const people = (peopleRes.data ?? []) as PersonProfile[]
    const openTasks = (taskRes.data ?? []).map((t: any) => ({ title: t.title as string, project_title: (Array.isArray(t.projects) ? t.projects[0] : t.projects)?.title ?? null }))

    // 1. Draft the tasks
    const drafts = await draftTasks({
      meeting: { title: m.title, date: m.meeting_date ?? m.created_at, summary: m.summary, transcript: m.transcript, action_items: items },
      circle, projects, openTasks, people: people.map(displayName), timeZone,
    }, { timeoutMs: opts.timeoutMs })
    if (drafts.note) errors.push(drafts.note)

    let added = 0
    let choresId: string | null = null
    for (const d of drafts.tasks) {
      const key = itemKey(d.title)
      if (!key) continue
      const person = matchPerson(d.person, people)
      // Claim the item first: a re-run (or a second webhook) can't add it twice
      const { error: claimErr } = await admin.from('meeting_action_links').insert({
        meeting_id: meetingId, item_key: key, item_index: d.item_index, item_text: d.source_text,
        person_name: d.person, assignee_id: person?.id ?? null, added_by: opts.requestedBy,
      })
      if (claimErr) { if (claimErr.code !== '23505') errors.push(`link: ${claimErr.message}`); continue }

      let projectId = d.project_id
      if (!projectId) {
        if (!choresId) {
          const { data, error } = await admin.rpc('chores_project_for_server', { p_circle: circleSlug })
          if (error || !data) { errors.push(`chores: ${error?.message ?? 'none'}`); await admin.from('meeting_action_links').delete().eq('meeting_id', meetingId).eq('item_key', key); continue }
          choresId = data as string
        }
        projectId = choresId
      }
      // Someone without an account keeps their name in the title, so the lead can pass it on
      const title = d.person && !person ? `${d.title} (for ${d.person})` : d.title
      const { data: task, error: taskErr } = await admin.from('deliverables').insert({
        project_id: projectId, title: title.slice(0, 300), assignee_id: person?.id ?? null, circle: circleSlug,
        due_date: d.due_date, due_time: d.due_date ? d.due_time : null, status: 'backlog', progress: 0,
        source: 'meeting', source_meeting_id: meetingId, source_item: d.source_text, needs_review: true,
        created_by: opts.requestedBy,
      }).select('id').single()
      if (taskErr || !task) {
        errors.push(`task: ${taskErr?.message ?? 'not created'}`)
        await admin.from('meeting_action_links').delete().eq('meeting_id', meetingId).eq('item_key', key)
        continue
      }
      await admin.from('meeting_action_links').update({ deliverable_id: task.id }).eq('meeting_id', meetingId).eq('item_key', key)
      await log('create_task', { title, project_id: projectId, person: d.person, assignee_id: person?.id ?? null, due_date: d.due_date, due_time: d.due_time, by: drafts.by }, { table: 'deliverables', id: task.id })
      added++
    }

    // Every task this meeting has on the board (this run and earlier ones), for the note and email
    const { data: linkRows } = await admin.from('meeting_action_links')
      .select('person_name, assignee_id, deliverables(id, title, project_id, needs_review, due_date, due_time, status)')
      .eq('meeting_id', meetingId).not('deliverable_id', 'is', null).order('created_at')
    const tasks = (linkRows ?? []).map((l: any) => {
      const t = Array.isArray(l.deliverables) ? l.deliverables[0] : l.deliverables
      if (!t) return null
      return {
        // "(for Luis)" is for the board; the note and email show the person already
        title: (t.title as string).replace(/ \(for [^)]+\)$/, ''), person: (l.person_name as string | null), onMyCoNet: !!l.assignee_id || !l.person_name,
        url: `${appUrl}/ops/${t.project_id}?task=${t.id}`, draft: !!t.needs_review,
        when: t.due_date ? fmtTaskWhen(t.due_date, t.due_time) : null,
      }
    }).filter((t): t is NonNullable<typeof t> => !!t)
    const notOnMyCoNet = [...new Set(tasks.filter(t => t.person && !t.onMyCoNet).map(t => t.person as string))]
    const day = localDay(m.meeting_date ?? m.created_at, timeZone)

    // 2. The second brain note
    let note: PipelineResult['note'] = null
    let notesUrl: string | null = null
    if (secondBrainOn()) {
      const path = notePath(day.date, m.title)
      try {
        const content = buildNote({
          id: meetingId, title: m.title, date: day.date, circle, visibility: m.visibility as MeetingVisibility,
          attendees: (m.attendees ?? []) as string[], summary: m.summary, action_items: items, tasks, appUrl,
        })
        const saved = await saveNote(path, content, `Meeting notes: ${m.title} (${day.date})`)
        notesUrl = saved.url
        note = saved
        await admin.from('meeting_transcripts').update({ notes_path: path, notes_url: saved.url }).eq('id', meetingId)
        await log('save_note', { path, url: saved.url })
      } catch (e) {
        note = { error: (e as Error).message }
        errors.push(`second brain: ${(e as Error).message}`)
      }
    }

    // 3. Email the circle's leads (once on its own; again only when asked)
    let email: PipelineResult['email'] = null
    if (notesEmailOn() && (opts.email === 'again' || (opts.email === 'auto' && !m.notes_emailed_at))) {
      const { emails, leadCount } = await notesRecipients(admin, circleSlug)
      if (!emails.length) {
        email = { sent: 0, error: leadCount ? 'The circle’s leads have no email on their accounts' : 'No circle lead with an account yet' }
      } else {
        const when = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(m.meeting_date ?? m.created_at))
        const mail = buildNotesEmail({ id: meetingId, title: m.title, when, circleName: circle.name, summary: m.summary, tasks, notOnMyCoNet, notesUrl, appUrl })
        const results = await sendEmails(emails, mail)
        const sent = results.filter(r => r === null).length
        const failed = results.filter((r): r is string => r !== null)
        email = { sent, ...(failed.length ? { error: `${failed.length} failed: ${failed[0]}` } : {}) }
        await log('email_notes', { sent, failed: failed.length, recipients: emails.length })
      }
      await admin.from('meeting_transcripts').update({
        ...(email.sent > 0 ? { notes_emailed_at: new Date().toISOString() } : {}),
        notes_email_count: email.sent, notes_email_error: email.error ?? null,
      }).eq('id', meetingId)
      if (email.error) errors.push(`email: ${email.error}`)
    }

    await admin.from('meeting_transcripts').update({
      processed_at: new Date().toISOString(), processing_started_at: null,
      processing_error: errors.length ? errors.join(' · ').slice(0, 1000) : null,
      tasks_drafted: tasks.length,
    }).eq('id', meetingId)
    return { ok: true, added, by: drafts.by, note, email, errors }
  } catch (e) {
    const message = (e as Error).message
    await admin.from('meeting_transcripts').update({ processing_started_at: null, processing_error: message.slice(0, 1000) }).eq('id', meetingId)
    return { ok: false, added: 0, errors: [...errors, message] }
  }
}
