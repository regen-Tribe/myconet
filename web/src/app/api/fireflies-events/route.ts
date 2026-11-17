import { after, NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/core/lib/supabase/service'
import { moduleOn } from '@/core/lib/modules'
import { fetchTranscript, transcriptFields, verifyFirefliesSignature } from '@/modules/m18-meetings/lib/fireflies'
import { processMeeting } from '@/modules/m18-meetings/lib/pipeline'

// Fireflies Webhooks V2 (app.fireflies.ai/integrations/api/webhook, events meeting.transcribed and
// meeting.summarized, signed with FIREFLIES_SIGNING_SECRET). Fireflies writes its summary and action
// items a few minutes after the transcript, so the first webhooks (/api/fireflies-webhook for uploads,
// /api/fireflies-ingest for direct recordings) often get the transcript only. meeting.summarized
// fetches the notes again and runs the meeting pipeline again: tasks already on the board aren't added
// twice, the second-brain note is updated in place, and the email still goes once.
export async function POST(req: NextRequest) {
  const secret = process.env.FIREFLIES_SIGNING_SECRET
  const raw = await req.text()
  if (!moduleOn('meetings') || !secret || !(await verifyFirefliesSignature(raw, req.headers.get('x-hub-signature'), secret))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  let body: { event?: string; meeting_id?: string; client_reference_id?: string }
  try { body = JSON.parse(raw) } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }
  const { event, meeting_id: firefliesId, client_reference_id: ref } = body
  if (event !== 'meeting.transcribed' && event !== 'meeting.summarized') return NextResponse.json({ received: true, skipped: event ?? 'no event' })
  if (!firefliesId) return NextResponse.json({ error: 'no meeting_id' }, { status: 400 })

  const admin = createServiceClient()
  try {
    // An upload carries our id as client_reference_id; a direct recording is found by its Fireflies id
    const byRef = ref ? (await admin.from('meeting_transcripts').select('id').eq('id', ref).maybeSingle()).data : null
    const existing = byRef ?? (await admin.from('meeting_transcripts').select('id').eq('fireflies_id', firefliesId).maybeSingle()).data
    const t = await fetchTranscript(firefliesId)
    const fields = transcriptFields(t)
    let id: string
    if (existing) {
      id = existing.id
      // Never blank notes that are already in (meeting.transcribed can come after meeting.summarized)
      await admin.from('meeting_transcripts').update({
        fireflies_id: firefliesId, status: fields.status, transcript: fields.transcript, error: null,
        ...(fields.summary ? { summary: fields.summary } : {}),
        ...(fields.action_items.length ? { action_items: fields.action_items } : {}),
        ...(fields.meeting_date ? { meeting_date: fields.meeting_date } : {}),
      }).eq('id', id)
    } else {
      // Recorded in Fireflies and not in yet (as /api/fireflies-ingest)
      const { data, error } = await admin.from('meeting_transcripts').insert({
        title: t.title || 'Untitled meeting', meeting_date: null,
        attendees: (t.speakers ?? []).map(s => s.name).filter(Boolean),
        fireflies_id: firefliesId, ...fields,
        source: 'fireflies_direct', needs_review: true, circle: null, created_by: null,
      }).select('id').single()
      if (error) throw new Error(error.message)
      id = data.id
    }
    // After the reply (Fireflies wants it within 30 s); the AI gets 22 s, as in the other two routes
    after(async () => {
      const { data: m } = await admin.from('meeting_transcripts').select('created_by').eq('id', id).maybeSingle()
      await processMeeting(admin, id, { requestedBy: m?.created_by ?? null, timeoutMs: 22_000, email: 'auto' })
    })
    return NextResponse.json({ received: true, id, event, summary: !!fields.summary, action_items: fields.action_items.length })
  } catch (e) {
    // 5xx so Fireflies retries (30 s, 2 min, 10 min, 30 min, 2 h)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'error' }, { status: 502 })
  }
}
