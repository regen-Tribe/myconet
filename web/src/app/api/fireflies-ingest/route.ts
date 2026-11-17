import { after, NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/core/lib/supabase/service'
import { moduleOn } from '@/core/lib/modules'
import { fetchTranscript, transcriptFields } from '@/modules/m18-meetings/lib/fireflies'
import { processMeeting } from '@/modules/m18-meetings/lib/pipeline'

// Meetings recorded straight in Fireflies (not uploaded here; most meetings): Fireflies' own webhook
// (or the community's Fireflies router) calls this (?key=PROTOPIA_INGEST_SECRET … the community's
// ingest secret) once the meeting is summarized. The notes are saved, then the meeting pipeline runs:
// the agent decides whether it's a community meeting and which circle(s), and only then puts tasks on
// the board, saves the note to the second brain and emails the leads.
// Not a community meeting, or not sure → it waits for a lead (needs_review).
//
// Uploads come here too, with client_reference_id (our meeting id): their own webhook
// (/api/fireflies-webhook) fires when the transcript is ready, before Fireflies has the summary and
// action items. A meeting already here without a summary is filled in now and then read by the agent.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: NextRequest) {
  const secret = process.env.PROTOPIA_INGEST_SECRET
  if (!moduleOn('meetings') || !secret || req.nextUrl.searchParams.get('key') !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  let body: { meetingId?: string; meeting_id?: string; client_reference_id?: string; clientReferenceId?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }
  const meetingId = body.meetingId || body.meeting_id
  if (!meetingId) return NextResponse.json({ error: 'no meetingId' }, { status: 400 })
  const ref = body.client_reference_id || body.clientReferenceId || null

  const admin = createServiceClient()
  // An upload is found by its own id; anything else by its Fireflies id
  const { data: existing } = ref
    ? UUID.test(ref)
      ? await admin.from('meeting_transcripts').select('id, summary, created_by, fireflies_id').eq('id', ref).maybeSingle()
      : { data: null }
    : await admin.from('meeting_transcripts').select('id, summary, created_by, fireflies_id').eq('fireflies_id', meetingId).maybeSingle()
  if (ref && !existing) return NextResponse.json({ received: true, skipped: 'not an upload of this community' })
  if (existing?.summary) return NextResponse.json({ received: true, skipped: 'already imported', id: existing.id })
  if (existing && existing.fireflies_id && existing.fireflies_id !== meetingId) {
    return NextResponse.json({ received: true, skipped: 'that upload belongs to another Fireflies meeting', id: existing.id })
  }
  try {
    const t = await fetchTranscript(meetingId)
    const fields = transcriptFields(t)
    if (existing) {
      // Here already (an upload), still without notes: fill them in
      if (!fields.summary) return NextResponse.json({ received: true, skipped: 'no summary in Fireflies yet', id: existing.id })
      const { error } = await admin.from('meeting_transcripts').update({ fireflies_id: meetingId, ...fields, error: null }).eq('id', existing.id)
      if (error) throw new Error(error.message)
      after(() => processMeeting(admin, existing.id, { requestedBy: existing.created_by ?? null, timeoutMs: 22_000, email: 'auto' }).then(() => {}))
      return NextResponse.json({ received: true, refilled: true, id: existing.id })
    }
    const { data, error } = await admin.from('meeting_transcripts').insert({
      title: t.title || 'Untitled meeting',
      meeting_date: null,
      attendees: (t.speakers ?? []).map(s => s.name).filter(Boolean),
      fireflies_id: meetingId,
      ...fields,
      source: 'fireflies_direct', needs_review: true, circle: null, created_by: null,
    }).select('id').single()
    if (error) throw new Error(error.message)
    // After the reply; the AI gets 20 s (waitUntil lasts about 30 s). A lead can run it again.
    after(() => processMeeting(admin, data.id, { requestedBy: null, timeoutMs: 22_000, email: 'auto' }).then(() => {}))
    return NextResponse.json({ received: true, id: data.id })
  } catch (e) {
    return NextResponse.json({ received: true, error: e instanceof Error ? e.message : 'error' })
  }
}
