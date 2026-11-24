'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Icon, NextStep, type IconName } from '@/core/components/v4'
import { createClient } from '@/core/lib/supabase/client'
import { isFullMember, isJoiningOrAbove } from '@/core/lib/roles'
import { JOIN_REVIEWER, joinSteps, type JoinStepKey } from '@/core/lib/join-path'
import { JoinPathView } from './JoinPathView'
import { AvatarCropper } from '@/core/components/AvatarCropper'
import { uploadAvatarBlob } from '@/core/lib/avatar'
import { COMMUNITY_DESCRIPTION, COMMUNITY_NAME } from '@/core/lib/instance'
import './join-review.css'

/**
 * Start joining with the design review: one focused flow (FocusShell, no menu around it), the track on top and
 * one step per screen with Back and Continue: Get to know us · About you · Apply. Everything happens here; About
 * opens in a new tab for anyone who wants to read more (Sonia, 24 Nov: "isolate more while providing links if
 * they want to read more", replacing #80's "read and sign on About"). The step is in the address (?step=).
 * The same steps as the menu's next step and the Dashboard (core/lib/join-path.ts). Words: LEXICON.md › Joining.
 * The old page (JoinClient) stays for communities without "designReview".
 */

interface Value { id: string; title: string; description: string }
interface Profile { first_name: string | null; last_name: string | null; headline: string | null; avatar_url?: string | null; public_bio?: string | null }

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const ORDER: JoinStepKey[] = ['values', 'profile', 'application']

// What each stage opens (LEXICON.md roles), folded away under the flow
const STAGES: { role: string; name: string; how: string; opens: [IconName, string][] }[] = [
  { role: 'explorer', name: 'Explorer', how: 'Create an account', opens: [['book', 'Read about the community'], ['users', 'Meet the members'], ['calendar', 'See what’s on']] },
  { role: 'joining', name: 'Joining member', how: 'Your application is accepted', opens: [['handshake', 'Offer help on tasks'], ['circles', 'Ask to join a circle'], ['chat', 'Agreements and meeting notes']] },
  { role: 'member', name: 'Member', how: 'Your first agreement is accepted', opens: [['vote', 'Vote on proposals'], ['plus', 'Suggest tasks and proposals'], ['star', 'Lead a task']] },
]

/** "Read more about Protopia", in a new tab so the flow stays where it is */
function ReadMore({ label = `Read more about ${COMMUNITY_NAME}` }: { label?: string }) {
  return <a href="/about" target="_blank" rel="noopener" className="jf-more">{label}<Icon name="external" size={14} /></a>
}

export default function JoinReview({ userId, role, values, initialSigned, questions, profile, offers = [], application, initialStep }: {
  userId: string | null
  role: string
  values: Value[]
  initialSigned: string[]
  questions: string[]
  profile: Profile | null
  /** What the person already offers (user_offers titles), so step 2 shows them chosen */
  offers?: string[]
  application: { status: string; created_at: string } | null
  initialStep: JoinStepKey | null
}) {
  const router = useRouter()
  const [signed, setSigned] = useState(() => new Set(initialSigned))
  const [me, setMe] = useState<Profile | null>(profile)
  const [appStatus, setAppStatus] = useState<string | null>(application?.status ?? null)
  const [sentNow, setSentNow] = useState(false)
  const joined = !!userId && isJoiningOrAbove(role)
  const path = joinSteps({
    valuesSigned: values.filter(v => signed.has(v.id)).length,
    valuesTotal: values.length,
    hasPhoto: !!me?.avatar_url,
    hasHeadline: !!me?.headline,
    application: appStatus,
    joined,
  })
  const waiting = appStatus === 'pending' || appStatus === 'reviewing'
  const [open, setOpen] = useState<JoinStepKey | null>(userId && !joined ? (initialStep ?? path.next?.key ?? 'values') : null)

  // The open step lives in the address, so reloading or sharing the link opens the same step
  useEffect(() => {
    if (!open || typeof window === 'undefined') return
    const url = `/join?step=${open}`
    if (window.location.pathname + window.location.search !== url) window.history.replaceState(null, '', url)
  }, [open])

  const go = (key: JoinStepKey) => { setOpen(key); if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const back = (key: JoinStepKey) => { const i = ORDER.indexOf(key); if (i > 0) go(ORDER[i - 1]) }
  const here = userId ? (isFullMember(role) ? 'member' : role) : null
  const sent = waiting || sentNow

  return (
    <div className="jf">
      <header className="jf-head">
        <h1>{joined ? 'Joining' : sent ? 'Your application is in' : 'Start joining'}</h1>
        <p>{joined
          ? (isFullMember(role) ? `You’re a member of ${COMMUNITY_NAME}.` : 'You’re a joining member. One accepted agreement makes you a member.')
          : sent
            ? `${cap(JOIN_REVIEWER)} reads it and answers within a week.`
            : `Three short steps, about ten minutes. ${cap(JOIN_REVIEWER)} reads your application and answers within a week.`}</p>
      </header>

      {!joined && (
        <JoinPathView path={path} current={sent ? null : open} onPick={userId && !sent ? k => go(k) : undefined} />
      )}

      <section className="v4-card jf-card" aria-live="polite">
        {/* Signed out: what the three steps are, and the one way to start */}
        {!userId && (
          <div className="jf-step">
            <h2>Create an account to start</h2>
            <p className="jf-text">Then get to know us, tell us about you, and apply. You can stop at any step and come back.</p>
            <div className="jf-nav jf-nav--end">
              <Button variant="quiet" href="/auth/login">Sign in</Button>
              <Button variant="next" href="/auth/signup">Create account</Button>
            </div>
          </div>
        )}

        {userId && !joined && sent && (
          <div className="jf-step jf-done">
            <span className="jf-done__mark" aria-hidden="true"><Icon name="check" size={24} /></span>
            <h2>Sent{application?.created_at && !sentNow ? ` on ${fmt(application.created_at)}` : ''}</h2>
            <p className="jf-text">Meanwhile, look around: meet the members and see what’s on.</p>
            <div className="jf-nav jf-nav--center">
              <Button variant="next" href="/dashboard">Go to Dashboard</Button>
            </div>
          </div>
        )}

        {userId && !joined && !sent && open === 'values' && (
          <KnowUsStep userId={userId} values={values} signed={signed} onSigned={ids => setSigned(prev => new Set([...prev, ...ids]))} onNext={() => go('profile')} />
        )}
        {userId && !joined && !sent && open === 'profile' && (
          <AboutYouStep userId={userId} profile={me} offers={offers} onSaved={p => setMe(prev => ({ ...(prev ?? { first_name: null, last_name: null, headline: null }), ...p }))}
            onBack={() => back('profile')} onNext={() => go('application')} />
        )}
        {userId && !joined && !sent && open === 'application' && (
          <ApplicationStep userId={userId} questions={questions} rejected={appStatus === 'rejected'} unsignedValues={values.length - values.filter(v => signed.has(v.id)).length}
            onBack={() => back('application')} onBackToValues={() => go('values')}
            onSent={() => { setAppStatus('pending'); setSentNow(true); window.scrollTo({ top: 0 }); router.refresh() }} />
        )}

        {joined && (
          <div className="jf-step">
            {!isFullMember(role)
              ? <NextStep title="Your first agreement" text="Offer help on a task. Once it’s accepted, you’re a member." href="/operations" />
              : <p className="jf-text">You can vote, suggest tasks and proposals, and lead a task.</p>}
          </div>
        )}
      </section>

      <div className="jf-foot">
        {/* Step 1 has its own link to About, next to the values */}
        {!(userId && !joined && !sent && open === 'values') && <ReadMore />}
        <details className="jf-opens">
          <summary>What joining opens</summary>
          <ul>
            {STAGES.map(st => (
              <li key={st.role} className={here === st.role ? 'here' : undefined}>
                <b>{st.name}{here === st.role && <span className="jf-you">You</span>}</b>
                <small>{st.how}</small>
                <span>{st.opens.map(([, text]) => text).join(' · ')}</span>
              </li>
            ))}
          </ul>
          <p>Task leads, circle leads and admins are asked by an admin.</p>
        </details>
      </div>
    </div>
  )
}

function fmt(iso: string | undefined | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// Step 1: who we are in a line, the values right here, and "I share these values" (one signature per value,
// the same value_signatures rows as About's values chapter). About opens in a new tab for the full story.
function KnowUsStep({ userId, values, signed, onSigned, onNext }: {
  userId: string; values: Value[]; signed: Set<string>; onSigned: (ids: string[]) => void; onNext: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const done = values.every(v => signed.has(v.id))

  async function sign() {
    setBusy(true); setError('')
    const rows = values.filter(v => !signed.has(v.id)).map(v => ({ user_id: userId, value_id: v.id }))
    const { error: err } = rows.length ? await createClient().from('value_signatures').insert(rows) : { error: null }
    setBusy(false)
    if (err) { setError(`Couldn’t save your signature: ${err.message}. Try again.`); return }
    onSigned(rows.map(r => r.value_id))
  }

  return (
    <div className="jf-step">
      <small className="jf-eyebrow">Step 1 of 3</small>
      <h2>Get to know us</h2>
      <p className="jf-text">
        {COMMUNITY_DESCRIPTION ? `${COMMUNITY_NAME} is ${COMMUNITY_DESCRIPTION.charAt(0).toLowerCase()}${COMMUNITY_DESCRIPTION.slice(1).replace(/\.$/, '')}. ` : ''}
        {values.length > 0 ? 'These are the values we live by. If you share them, say so below.' : 'No values written yet; an admin adds them to About.'}
      </p>
      {values.length > 0 && (
        <ol className="jf-values">
          {values.map((v, i) => (
            <li key={v.id}><span className="jf-n" aria-hidden="true">{i + 1}</span><div><b>{v.title}</b>{v.description && <p>{v.description}</p>}</div></li>
          ))}
        </ol>
      )}
      <ReadMore label={`The whole story: About ${COMMUNITY_NAME}`} />
      {error && <p className="jr-error" role="alert">{error}</p>}
      <div className="jf-nav jf-nav--end">
        {done
          ? <>{values.length > 0 && <span className="jf-ok"><Icon name="check-circle" size={16} />You share these values</span>}<Button variant="next" onClick={onNext}>Continue</Button></>
          : <Button variant="next" onClick={sign} disabled={busy}>{busy ? 'Signing…' : 'I share these values'}</Button>}
      </div>
    </div>
  )
}

// What people offer most here, as one-tap chips; each becomes an offer on their profile (category as in Edit profile)
const OFFER_CHIPS: [string, string][] = [
  ['Cooking', 'Food'], ['Building', 'Construction'], ['Gardening', 'Permaculture'], ['Art', 'Art'], ['Music', 'Music'],
  ['Teaching', 'Education'], ['Healing', 'Healing'], ['Technology', 'Technology'], ['Childcare', 'Childcare'],
]

// Step 2 (#81): a short form here, not the eight-tab editor. A line about you finishes the step; it can be skipped,
// since the application can be sent without it
function AboutYouStep({ userId, profile, offers, onSaved, onBack, onNext }: {
  userId: string; profile: Profile | null; offers: string[]; onSaved: (p: Partial<Profile>) => void; onBack: () => void; onNext: () => void
}) {
  const supabase = createClient()
  const [photo, setPhoto] = useState<string | null>(profile?.avatar_url ?? null)
  const [pending, setPending] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [line, setLine] = useState(profile?.headline ?? '')
  const [why, setWhy] = useState(profile?.public_bio ?? '')
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(offers))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'You'

  async function cropped(blob: Blob) {
    setUploading(true); setError('')
    try { const url = await uploadAvatarBlob(supabase, userId, blob); setPhoto(url); onSaved({ avatar_url: url }); setPending(null) }
    catch (err) { setError(`The photo didn’t upload: ${err instanceof Error ? err.message : String(err)}`) }
    finally { setUploading(false) }
  }

  const flip = (t: string) => setChosen(prev => { const n = new Set(prev); if (n.has(t)) n.delete(t); else n.add(t); return n })

  async function save() {
    if (!line.trim()) { setError('Add a line about you, or skip this step for now.'); return }
    setSaving(true); setError('')
    const { error: e1 } = await supabase.from('user_profiles').update({ headline: line.trim(), public_bio: why.trim() || null }).eq('id', userId)
    const added = OFFER_CHIPS.filter(([t]) => chosen.has(t) && !offers.includes(t)).map(([title, category]) => ({ user_id: userId, title, category }))
    const { error: e2 } = added.length ? await supabase.from('user_offers').insert(added) : { error: null }
    setSaving(false)
    if (e1 || e2) { setError(`Couldn’t save: ${(e1 ?? e2)!.message}. Try again.`); return }
    onSaved({ headline: line.trim(), public_bio: why.trim() || null })
    onNext()
  }

  return (
    <div className="jf-step">
      {pending && <AvatarCropper file={pending} busy={uploading} onCancel={() => setPending(null)} onCropped={cropped} />}
      <small className="jf-eyebrow">Step 2 of 3</small>
      <h2>Tell us about you</h2>
      <p className="jf-text">A few words so people know who they’ll meet. You can add more to your profile any time.</p>
      <label className="jr-me jr-photo">
        {photo ? <img src={photo} alt="" className="jr-av" /> : <span className="jr-av">{name.slice(0, 1).toUpperCase()}</span>}
        <span><b>{photo ? 'Change your photo' : 'Add a photo'}</b><small>{uploading ? 'Uploading…' : 'A clear face helps'}</small></span>
        <input type="file" accept="image/*" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) setPending(f); e.target.value = '' }} />
      </label>
      <label className="jr-field">
        <span>A line about you</span>
        <input value={line} onChange={e => setLine(e.target.value)} maxLength={120} placeholder="e.g. Permaculture designer and drummer" />
      </label>
      <fieldset className="jr-field jr-offers">
        <legend>What you’d like to offer</legend>
        <div className="jr-chips">
          {OFFER_CHIPS.map(([t]) => (
            <button key={t} type="button" className={`v4-chip${chosen.has(t) ? ' v4-chip--on' : ''}`} aria-pressed={chosen.has(t)} onClick={() => flip(t)}>{t}</button>
          ))}
        </div>
      </fieldset>
      <label className="jr-field">
        <span>What brings you to {COMMUNITY_NAME} <small>Optional</small></span>
        <textarea rows={3} value={why} onChange={e => setWhy(e.target.value)} placeholder="A few words" />
      </label>
      {error && <p className="jr-error" role="alert">{error}</p>}
      <div className="jf-nav">
        <Button variant="quiet" icon="left" onClick={onBack}>Back</Button>
        <span className="jf-nav__end">
          <Button variant="quiet" onClick={onNext}>Skip for now</Button>
          <Button variant="next" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Continue'}</Button>
        </span>
      </div>
    </div>
  )
}

function ApplicationStep({ userId, questions, rejected, unsignedValues, onBack, onBackToValues, onSent }: {
  userId: string; questions: string[]; rejected: boolean; unsignedValues: number; onBack: () => void; onBackToValues: () => void; onSent: () => void
}) {
  const supabase = createClient()
  const [answers, setAnswers] = useState<string[]>(() => questions.map(() => ''))
  const [extra, setExtra] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  async function send() {
    setSending(true); setError('')
    // q0, q1… match the Blueprint's questions; _questions keeps their wording in case they're edited later (same as JoinClient)
    const payload: Record<string, unknown> = { extra, _questions: questions }
    questions.forEach((_, i) => { payload[`q${i}`] = answers[i]?.trim() ?? '' })
    const { error: err } = await supabase.from('applications').upsert({ user_id: userId, answers: payload, status: 'pending' }, { onConflict: 'user_id' })
    if (err) { setError(err.message); setSending(false); return }
    onSent()
  }

  return (
    <div className="jf-step">
      <small className="jf-eyebrow">Step 3 of 3</small>
      <h2>{rejected ? 'A new application' : 'Apply'}</h2>
      {rejected && <p className="jf-text">Your last application wasn’t accepted. You can send a new one.</p>}
      {questions.length === 0 && <p className="jf-text">Tell the community about yourself: who you are, what draws you here, and what you’d like to bring.</p>}
      {/* A question is ordinary text, not a bold label: some are a whole paragraph (the Blueprint's own words) */}
      {questions.map((q, i) => (
        <div key={i} className="jf-q">
          <label htmlFor={`jf-q${i}`}>{questions.length > 1 && <span className="jf-n" aria-hidden="true">{i + 1}</span>}<span>{q}</span></label>
          <span className="jr-field"><textarea id={`jf-q${i}`} rows={4} value={answers[i] ?? ''} onChange={e => setAnswers(a => a.map((x, j) => (j === i ? e.target.value : x)))} /></span>
        </div>
      ))}
      <div className="jf-q">
        <label htmlFor="jf-extra"><span>Anything else? <small>Optional</small></span></label>
        <span className="jr-field"><textarea id="jf-extra" rows={3} value={extra} onChange={e => setExtra(e.target.value)} /></span>
      </div>
      {error && <p className="jr-error" role="alert">{error}</p>}
      {/* Why Send waits, said next to the button, with the way to fix it */}
      {unsignedValues > 0 && (
        <p className="jf-warn"><Icon name="info" size={16} /><span>To send, first share the values in step 1. <button type="button" className="jr-link" onClick={onBackToValues}>Go to step 1</button></span></p>
      )}
      <div className="jf-nav">
        <Button variant="quiet" icon="left" onClick={onBack}>Back</Button>
        <Button variant="next" onClick={send} disabled={sending || unsignedValues > 0}>{sending ? 'Sending…' : 'Send application'}</Button>
      </div>
    </div>
  )
}
