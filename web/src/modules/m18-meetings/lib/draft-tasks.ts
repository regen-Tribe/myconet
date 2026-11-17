/**
 * The agent's part of the meeting pipeline: turn a meeting into board tasks — server only.
 *
 * It starts from Fireflies' action items and reads the summary and transcript for the details
 * (who, by when, which project) and for anything clearly agreed that Fireflies missed. It also sees
 * the circle's open projects and tasks, to put each task in the right project and skip what's
 * already on the board. Without the AI (no key, timeout, unreadable answer) the action items
 * become tasks as they are.
 */
import type { ActionItem } from '../types'

const MODEL = 'MiniMax-M3.1-Flash'
const MAX_TRANSCRIPT = 40_000
const MAX_TASKS = 25

export interface DraftInput {
  meeting: { title: string; date: string; summary: string | null; transcript: string | null; action_items: ActionItem[] }
  circle: { slug: string; name: string }
  /** Open projects in the meeting's circle (not its Chores) */
  projects: { id: string; title: string; description: string | null }[]
  /** Open tasks already on the board in this circle */
  openTasks: { title: string; project_title: string | null }[]
  /** Members' names, so the AI keeps their spellings */
  people: string[]
  timeZone: string
}

export interface DraftTask {
  title: string
  /** The person as named in the meeting; matched to a member later */
  person: string | null
  /** One of DraftInput.projects, or null for the circle's Chores */
  project_id: string | null
  due_date: string | null
  due_time: string | null
  /** Fireflies' action item it came from, if any */
  item_index: number | null
  /** What the item said in the meeting, kept with the task */
  source_text: string
}

/** "2026-11-17" and "Tuesday" for a moment, in the community's time zone */
export function localDay(iso: string, timeZone: string): { date: string; weekday: string } {
  const d = new Date(iso)
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long' }).format(d)
  return { date: parts, weekday }
}

const clean = (s: string, max: number) => s.replace(/\s+/g, ' ').replace(/[.;]+$/, '').trim().slice(0, max)

/** Fireflies' action items as tasks, as they are */
export function fallbackDrafts(items: ActionItem[]): DraftTask[] {
  return items.slice(0, MAX_TASKS).map((it, i) => ({
    title: clean(it.text, 120), person: it.speaker, project_id: null, due_date: null, due_time: null,
    item_index: i, source_text: it.text,
  })).filter(t => t.title)
}

function prompt(input: DraftInput): string {
  const { date, weekday } = localDay(input.meeting.date, input.timeZone)
  const items = input.meeting.action_items.map((it, i) => `${i}. ${it.speaker ? `[${it.speaker}] ` : ''}${it.text}`).join('\n') || '(none)'
  const projects = input.projects.map(p => `- ${p.id} · ${p.title}${p.description ? ` — ${p.description.slice(0, 160)}` : ''}`).join('\n') || '(none)'
  const open = input.openTasks.slice(0, 80).map(t => `- ${t.title}${t.project_title ? ` (${t.project_title})` : ''}`).join('\n') || '(none)'
  const transcript = (input.meeting.transcript ?? '').slice(0, MAX_TRANSCRIPT)
  return `You turn a community meeting into tasks for its task board. The meeting was on ${weekday} ${date} (time zone ${input.timeZone}), in the ${input.circle.name} circle.

Make one task per concrete thing someone agreed to do. Start from the action items, and use the summary and transcript to fill in who does it, by when, and which project it belongs to. Add a task the action items missed only when the transcript clearly shows it was agreed. Skip anything already in "Open tasks on the board". Leave out vague intentions, discussion points and decisions that need no work.

Put a task in a project only when it is clearly part of that project's work. Routine upkeep (cleaning, repairs, checks, restocking, chores) gets project_id null: it goes to the circle's Chores.

Return JSON only:
{"tasks":[{"title":"short imperative, under 90 characters, no person's name","person":"the person's name as said, or null","project_id":"an id from Projects, or null when none fits","due_date":"YYYY-MM-DD or null","due_time":"HH:MM 24h or null","item":the action item number it comes from, or null,"source":"the action item's words, or a short quote from the transcript"}]}

Dates only when the meeting says one; work relative ones ("by Friday", "next week", "tomorrow") out from ${weekday} ${date}. "Next week" with no day means the Monday after. At most ${MAX_TASKS} tasks.
${input.people.length ? `\nMembers' names (use these spellings when one matches): ${input.people.slice(0, 200).join(', ')}` : ''}

Meeting: ${input.meeting.title}

Projects in this circle:
${projects}

Open tasks on the board:
${open}

Action items (Fireflies):
${items}

Summary:
${input.meeting.summary ?? '(none)'}

Transcript${transcript.length === MAX_TRANSCRIPT ? ' (start)' : ''}:
${transcript || '(none)'}`
}

const hhmm = (v: unknown): string | null => {
  const m = typeof v === 'string' ? v.trim().match(/^(\d{1,2}):(\d{2})$/) : null
  return m && +m[1] < 24 && +m[2] < 60 ? `${m[1].padStart(2, '0')}:${m[2]}` : null
}
const ymd = (v: unknown): string | null =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.trim()) && !Number.isNaN(Date.parse(v.trim())) ? v.trim() : null
const str = (v: unknown, max: number): string | null => (typeof v === 'string' && v.trim() ? clean(v, max) : null)

export function parseDrafts(content: string, input: DraftInput): DraftTask[] | null {
  const c = content.replace(/<think>[\s\S]*?<\/think>/g, '')
  const start = c.indexOf('{'), end = c.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  let raw: { tasks?: unknown }
  try { raw = JSON.parse(c.slice(start, end + 1)) } catch { return null }
  if (!Array.isArray(raw.tasks)) return null
  const projectIds = new Set(input.projects.map(p => p.id))
  const items = input.meeting.action_items
  const out: DraftTask[] = []
  for (const t of raw.tasks.slice(0, MAX_TASKS) as Record<string, unknown>[]) {
    const title = str(t?.title, 120)
    if (!title) continue
    const idx = typeof t.item === 'number' && Number.isInteger(t.item) && items[t.item] ? t.item : null
    const date = ymd(t.due_date)
    out.push({
      title,
      person: str(t.person, 80) ?? (idx !== null ? items[idx].speaker : null),
      project_id: typeof t.project_id === 'string' && projectIds.has(t.project_id) ? t.project_id : null,
      due_date: date,
      due_time: date ? hhmm(t.due_time) : null,
      item_index: idx,
      source_text: (str(t.source, 400) ?? (idx !== null ? items[idx].text : title)),
    })
  }
  return out
}

/** The agent's drafts, or Fireflies' action items as they are when the AI can't help */
export async function draftTasks(input: DraftInput, opts: { timeoutMs: number }): Promise<{ tasks: DraftTask[]; by: 'ai' | 'action-items'; note?: string }> {
  const fallback = (note: string) => ({ tasks: fallbackDrafts(input.meeting.action_items), by: 'action-items' as const, note })
  const apiKey = process.env.MINIMAX_API_KEY
  if (!apiKey) return fallback('MINIMAX_API_KEY not set')
  if (!input.meeting.action_items.length && !input.meeting.summary && !input.meeting.transcript) return { tasks: [], by: 'ai' }

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs)
  try {
    const res = await fetch('https://api.minimax.io/v1/chat/completions', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        reasoning_effort: 'low',
        max_completion_tokens: 6000,
        messages: [{ role: 'user', content: prompt(input) }],
      }),
    })
    if (!res.ok) return fallback(`AI ${res.status}`)
    const data = await res.json().catch(() => ({})) as { choices?: { message?: { content?: string } }[] }
    const tasks = parseDrafts(data.choices?.[0]?.message?.content ?? '', input)
    return tasks ? { tasks, by: 'ai' } : fallback('AI answer unreadable')
  } catch (e) {
    return fallback((e as Error).name === 'AbortError' ? 'AI took too long' : `AI: ${(e as Error).message}`)
  } finally {
    clearTimeout(timer)
  }
}
