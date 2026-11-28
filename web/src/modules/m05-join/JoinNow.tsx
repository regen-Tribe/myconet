'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Icon } from '@/core/components/v4'
import { createClient } from '@/core/lib/supabase/client'
import { isJoiningOrAbove } from '@/core/lib/roles'
import { COMMUNITY_DESCRIPTION, COMMUNITY_NAME } from '@/core/lib/instance'
import { AvatarCropper } from '@/core/components/AvatarCropper'
import { uploadAvatarBlob } from '@/core/lib/avatar'
import { HomePicker } from '@/core/components/v4/HomePicker'
import { homesOf, homesToFields, type Home } from '@/core/lib/homes'
import { DESCRIBES, pastel } from '@/core/lib/skills-interests'
import { CLAIM_KEY, type JoinNowProfile, type Screen } from './join-now-screens'
import './join-now.css'

/**
 * The first onboarding with "joinAtOnce" (Sonia, 28 Nov 2026; design/decisions.md #107, the Miro board's blue row):
 * Welcome, then six short screens. Sign up · Check your email · Photo and one line · What are you up to in this
 * world? · A bit more about you · You're in. Finishing makes the person a joining member at once (join_now() in
 * the database): no application, no steward.
 *
 * Phone first: every screen is exactly one screen tall, with one question or one small group, one line of help at
 * most and one main button. "Skip for now" from the photo on. Each screen saves its own answer.
 * Words: LEXICON.md › Joining. The page stands alone: no menu, tab bar or assistant around it (AppShell).
 */

/** The six screens after Welcome, for the progress marks */
const STEPS: Screen[] = ['signup', 'email', 'photo', 'world', 'more', 'in']

const PORTAL = `${COMMUNITY_NAME} Portal`
const BRAND_MARK = process.env.NEXT_PUBLIC_BRAND_MARK || ''
const ABOUT_LINE = COMMUNITY_DESCRIPTION ? `${COMMUNITY_DESCRIPTION.trim().replace(/[.!?]$/, '')}.` : ''
// Where the invite link's name waits between Welcome and Sign up, and across a reload
const INVITE_KEY = 'jn-invite'

export default function JoinNow({ userId, role, profile, email, inviter, banner, initialScreen, placeholder = false, preview = false }: {
  userId: string | null
  role: string
  profile: JoinNowProfile | null
  email: string | null
  /** Whose invite link this is (?invite=<username>), when the name matches a member */
  inviter: { username: string; first_name: string | null } | null
  banner: string | null
  initialScreen: Screen
  /** Added by an admin (a guest who booked) and just claimed: the headline holds the admin's note, cleared on the photo screen */
  placeholder?: boolean
  /** Local development: a made-up person, nothing saved or sent */
  preview?: boolean
}) {
  const router = useRouter()
  const supabase = createClient()
  const [screen, setScreen] = useState<Screen>(initialScreen)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [me, setMe] = useState<JoinNowProfile | null>(profile)
  const joined = !!userId && (isJoiningOrAbove(role) || screen === 'in')

  // Sign up
  const [name, setName] = useState('')
  const [mail, setMail] = useState(email ?? '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  // The address is already known here (a guest who booked, or an account): a link to set a password was sent instead
  const [known, setKnown] = useState(false)
  const [resend, setResend] = useState<'idle' | 'sending' | 'sent'>('idle')

  // The four screens once signed in
  const [pending, setPending] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [line, setLine] = useState(profile?.headline ?? '')
  const [world, setWorld] = useState(profile?.public_bio ?? '')
  const [types, setTypes] = useState<string[]>(profile?.user_types ?? [])
  const [homes, setHomes] = useState<Home[]>(() => homesOf(profile?.city, profile?.country))
  const [shown, setShown] = useState(profile?.show_to_members ?? false)
  const [copied, setCopied] = useState(false)

  // The screen is in the address, so a reload or the email's link opens the same one
  useEffect(() => {
    if (preview) return
    const url = `/join?step=${screen}`
    if (window.location.pathname + window.location.search !== url) window.history.replaceState(null, '', url)
  }, [screen, preview])

  // Keep whose link this was until sign-up, even if the person looks around first
  useEffect(() => {
    try { if (inviter?.username) window.localStorage.setItem(INVITE_KEY, inviter.username) } catch { /* private mode */ }
  }, [inviter])

  const go = (to: Screen) => { setError(''); setScreen(to) }
  const fullName = [me?.first_name, me?.last_name].filter(Boolean).join(' ') || 'You'
  const callback = () => `${window.location.origin}/auth/callback?onboarding=1`

  async function signUp(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setKnown(false); setResend('idle')
    const [first, ...rest] = name.trim().split(/\s+/)
    if (!first) { setError('Add your name.'); return }
    if (password.length < 6) { setError('Use at least 6 characters for the password.'); return }
    if (preview) { go('email'); return }
    setBusy(true)
    let invitedBy = inviter?.username ?? null
    try { invitedBy ??= window.localStorage.getItem(INVITE_KEY) } catch { /* private mode */ }
    const { data, error: err } = await supabase.auth.signUp({
      email: mail.trim(), password,
      options: { data: { first_name: first, last_name: rest.join(' '), ...(invitedBy ? { invited_by: invitedBy } : {}) }, emailRedirectTo: callback() },
    })
    if (err) { setBusy(false); setError(err.status === 429 ? 'Too many tries just now. Wait a minute and try again.' : err.message); return }
    // Supabase answers a sign-up for a known address with a user and no identities, and sends nothing. Someone who
    // booked as a guest is known already: send a link to set a password, which makes that profile theirs
    if (data.user && data.user.identities?.length === 0) {
      const resp = await fetch('/api/auth/forgot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: mail.trim() }) }).catch(() => null)
      setBusy(false)
      if (!resp?.ok) { setError('That email is already known here, and the link couldn’t be sent. Try again in a minute.'); return }
      try { window.localStorage.setItem(CLAIM_KEY, '1') } catch { /* private mode */ }
      setKnown(true); go('email'); return
    }
    setBusy(false)
    if (data.session) { router.refresh(); go('photo'); return }
    go('email')
  }

  async function sendAgain() {
    setError(''); setResend('sending')
    if (preview) { setResend('sent'); return }
    const { error: err } = known
      ? await fetch('/api/auth/forgot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: mail.trim() }) })
          .then(r => ({ error: r.ok ? null : { status: r.status, message: 'The link couldn’t be sent.' } }))
          .catch(() => ({ error: { status: 0, message: 'Couldn’t reach the portal.' } }))
      : await supabase.auth.resend({ type: 'signup', email: mail.trim(), options: { emailRedirectTo: callback() } })
    if (err) { setResend('idle'); setError(err.status === 429 ? 'Too many emails just now. Wait a minute and try again.' : `${err.message} Try again.`); return }
    setResend('sent')
  }

  async function cropped(blob: Blob) {
    if (!userId) return
    setUploading(true); setError('')
    if (preview) { setMe(p => (p ? { ...p, avatar_url: URL.createObjectURL(blob) } : p)); setPending(null); setUploading(false); return }
    try { const url = await uploadAvatarBlob(supabase, userId, blob); setMe(p => (p ? { ...p, avatar_url: url } : p)); setPending(null) }
    catch (err) { setError(`The photo didn’t upload: ${err instanceof Error ? err.message : String(err)}`) }
    finally { setUploading(false) }
  }

  /** Saves this screen's answer to the person's own profile, then moves on */
  async function save(patch: Record<string, unknown>, then: () => void | Promise<void>) {
    setError('')
    if (preview || !userId) { await then(); return }
    setBusy(true)
    const { error: err } = await supabase.from('user_profiles').update(patch).eq('id', userId)
    if (err) { setBusy(false); setError(`Couldn’t save: ${err.message}. Try again.`); return }
    setMe(p => (p ? { ...p, ...patch } as JoinNowProfile : p))
    await then()
    setBusy(false)
  }

  /** The last step: an explorer becomes a joining member, at once (the database decides, not this screen) */
  async function finish() {
    setError('')
    if (preview) { go('in'); return }
    setBusy(true)
    const { error: err } = await supabase.rpc('join_now')
    setBusy(false)
    if (err) { setError(`Couldn’t finish joining: ${err.message}. Try again.`); return }
    go('in'); router.refresh()
  }

  async function flipShown() {
    const next = !shown
    setShown(next); setError('')
    if (preview || !userId) return
    const { error: err } = await supabase.from('user_profiles').update({ show_to_members: next }).eq('id', userId)
    if (err) { setShown(!next); setError(`Couldn’t save: ${err.message}. Try again.`) }
  }

  async function copyInvite() {
    const link = `${window.location.origin}/join?invite=${encodeURIComponent(me?.username ?? '')}`
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2500) }
    catch { window.prompt('Your invite link', link) }
  }

  const at = STEPS.indexOf(screen)
  const backTo: Partial<Record<Screen, Screen>> = { signup: 'welcome', email: 'signup', world: 'photo', more: 'world' }
  const flipType = (t: string) => setTypes(prev => (prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]))

  return (
    <div className="jn" data-screen={screen}>
      {pending && <AvatarCropper file={pending} busy={uploading} onCancel={() => setPending(null)} onCropped={cropped} />}
      <div className="jn-phone">
        {screen !== 'welcome' && (
          <header className="jn-top">
            {backTo[screen] && !(screen === 'email' && known)
              ? <button type="button" className="jn-icon" aria-label="Back" onClick={() => go(backTo[screen]!)}><Icon name="left" size={20} /></button>
              : <span className="jn-icon" aria-hidden="true" />}
            {!(joined && isJoiningOrAbove(role)) && (
              <ol className="jn-marks" aria-label={`Screen ${at + 1} of ${STEPS.length}`}>
                {STEPS.map((s, i) => <li key={s} className={i < at ? 'done' : i === at ? 'now' : undefined} />)}
              </ol>
            )}
            {userId && screen !== 'in'
              ? <Link href="/dashboard" className="jn-later">Later</Link>
              : <span className="jn-icon" aria-hidden="true" />}
          </header>
        )}

        {/* 0 · Welcome: what the community and its portal are, in two lines, and three ways on */}
        {screen === 'welcome' && (
          <>
            <div className="jn-hero" style={banner ? { backgroundImage: `url(${banner})` } : undefined} aria-hidden="true" />
            <main className="jn-body jn-body--welcome">
              <span className="jn-brand">{BRAND_MARK ? <img src={BRAND_MARK} alt="" /> : <Icon name="sprout" size={20} />}{PORTAL}</span>
              <h1 className="jn-title jn-title--big">Welcome to {COMMUNITY_NAME}</h1>
              {ABOUT_LINE && <p className="jn-text">{ABOUT_LINE}</p>}
              <p className="jn-text">The {PORTAL} is where its people meet, plan and decide together.</p>
              {inviter && <p className="jn-invited"><Icon name="heart" size={16} />{inviter.first_name || inviter.username} invited you</p>}
            </main>
            <footer className="jn-foot">
              <button type="button" className="jn-btn" onClick={() => go('signup')}>Sign up</button>
              <Link href="/auth/login" className="jn-btn jn-btn--soft">Sign in</Link>
              <Link href="/about" className="jn-quiet">Look around</Link>
            </footer>
          </>
        )}

        {/* 1 · Sign up: only what the account needs */}
        {screen === 'signup' && (
          <form className="jn-form" onSubmit={signUp}>
            <main className="jn-body">
              <h1 className="jn-title">Sign up</h1>
              <p className="jn-text">Your {PORTAL} account.</p>
              <label className="jn-field"><span>Name</span>
                <input value={name} onChange={e => setName(e.target.value)} autoComplete="name" required maxLength={120} placeholder="Ana Reyes" />
              </label>
              <label className="jn-field"><span>Email</span>
                <input type="email" value={mail} onChange={e => setMail(e.target.value)} autoComplete="email" required placeholder="you@example.com" />
              </label>
              <label className="jn-field"><span>Password</span>
                <span className="jn-pass">
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" required minLength={6} placeholder="At least 6 characters" />
                  <button type="button" onClick={() => setShowPassword(s => !s)} aria-pressed={showPassword}>{showPassword ? 'Hide' : 'Show'}</button>
                </span>
              </label>
              {error && <p className="jn-error" role="alert">{error}</p>}
            </main>
            <footer className="jn-foot">
              <button type="submit" className="jn-btn" disabled={busy}>{busy ? 'Signing up…' : 'Sign up'}</button>
              <p className="jn-quiet">Have an account? <Link href="/auth/login">Sign in</Link></p>
            </footer>
          </form>
        )}

        {/* 2 · Check your email */}
        {screen === 'email' && (
          <>
            <main className="jn-body jn-body--center">
              <span className="jn-badge"><Icon name="mail" size={28} /></span>
              <h1 className="jn-title">Check your email</h1>
              {known
                ? <p className="jn-text"><b>{mail}</b> is already known at {COMMUNITY_NAME}. We sent a link: open it and choose a password to make it your {PORTAL} account.</p>
                : <p className="jn-text">We sent a link to <b>{mail || 'your email'}</b>. Open it to confirm, then carry on.</p>}
              {error && <p className="jn-error" role="alert">{error}</p>}
            </main>
            <footer className="jn-foot">
              <button type="button" className="jn-btn jn-btn--soft" onClick={sendAgain} disabled={resend !== 'idle'}>
                {resend === 'sent' ? 'Sent again' : resend === 'sending' ? 'Sending…' : 'Send again'}
              </button>
              <p className="jn-quiet">Wrong address? <button type="button" onClick={() => { setKnown(false); setResend('idle'); go('signup') }}>Change it</button></p>
            </footer>
          </>
        )}

        {/* 3 · Photo and one line, shown the way the card will look on Members */}
        {screen === 'photo' && (
          <>
            <main className="jn-body">
              <h1 className="jn-title">A photo and one line</h1>
              <p className="jn-text">Your card on Members.</p>
              <div className="jn-card">
                <label className="jn-av" aria-label={me?.avatar_url ? 'Change your photo' : 'Add a photo'}>
                  {me?.avatar_url ? <img src={me.avatar_url} alt="" /> : <span>{fullName.slice(0, 1).toUpperCase()}</span>}
                  <i><Icon name="camera" size={16} /></i>
                  <input type="file" accept="image/*" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) setPending(f); e.target.value = '' }} />
                </label>
                <span className="jn-card__txt"><b>{fullName}</b><small className={line.trim() ? undefined : 'empty'}>{line.trim() || 'One line about you'}</small></span>
              </div>
              <label className="jn-field"><span>One line about you</span>
                <input value={line} onChange={e => setLine(e.target.value)} maxLength={120} placeholder="e.g. Gardener and drummer" />
              </label>
              <p className="jn-help">{uploading ? 'Uploading your photo…' : me?.avatar_url ? 'Tap the photo to change it.' : 'Tap the circle to add a photo, or add it later.'}</p>
              {error && <p className="jn-error" role="alert">{error}</p>}
            </main>
            <footer className="jn-foot">
              <button type="button" className="jn-btn" disabled={busy || uploading} onClick={() => (line.trim() || placeholder ? save({ headline: line.trim() || null }, () => go('world')) : go('world'))}>{busy ? 'Saving…' : 'Continue'}</button>
              <button type="button" className="jn-quiet" onClick={() => go('world')}>Skip for now</button>
            </footer>
          </>
        )}

        {/* 4 · What are you up to in this world? */}
        {screen === 'world' && (
          <>
            <main className="jn-body">
              <h1 className="jn-title">What are you up to in this world?</h1>
              <label className="jn-field jn-field--grow"><span className="sr-only">What are you up to in this world?</span>
                <textarea value={world} onChange={e => setWorld(e.target.value)} maxLength={1000} placeholder="What you’re working on, and towards" />
              </label>
              {error && <p className="jn-error" role="alert">{error}</p>}
            </main>
            <footer className="jn-foot">
              <button type="button" className="jn-btn" disabled={busy} onClick={() => (world.trim() ? save({ public_bio: world.trim() }, () => go('more')) : go('more'))}>{busy ? 'Saving…' : 'Continue'}</button>
              <button type="button" className="jn-quiet" onClick={() => go('more')}>Skip for now</button>
            </footer>
          </>
        )}

        {/* 5 · A bit more about you: what best describes you, and home */}
        {screen === 'more' && (
          <>
            <main className="jn-body">
              <h1 className="jn-title">A bit more about you</h1>
              <fieldset className="jn-group">
                <legend>What best describes you?</legend>
                <div className="pp-describes">
                  {DESCRIBES.map((d, i) => (
                    <button key={d.id} type="button" style={pastel(i) as React.CSSProperties} className="pp-pill" aria-pressed={types.includes(d.id)} onClick={() => flipType(d.id)}>
                      {types.includes(d.id) && <Icon name="check" size={16} />}{d.label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <HomePicker value={homes} onChange={setHomes} />
              {error && <p className="jn-error" role="alert">{error}</p>}
            </main>
            <footer className="jn-foot">
              <button type="button" className="jn-btn" disabled={busy} onClick={() => save({ user_types: types, ...homesToFields(homes) }, finish)}>{busy ? 'Joining…' : 'Continue'}</button>
              <button type="button" className="jn-quiet" disabled={busy} onClick={finish}>Skip for now</button>
            </footer>
          </>
        )}

        {/* 6 · You're in: a joining member straight away. Being shown to other members is the person's own choice */}
        {screen === 'in' && (
          <>
            <main className="jn-body jn-body--center">
              <span className="jn-badge jn-badge--good"><Icon name="check" size={28} /></span>
              <h1 className="jn-title">You’re in</h1>
              <p className="jn-text">Welcome to {COMMUNITY_NAME}{me?.first_name ? `, ${me.first_name}` : ''}. You’re part of the community, wherever you are.</p>
              <div className="jn-switch">
                <span id="jn-shown"><b>Show me to other members</b><small>{shown ? 'You’re listed on Members.' : 'Off: you’re not listed on Members or in search.'}</small></span>
                <button type="button" role="switch" aria-checked={shown} aria-labelledby="jn-shown" onClick={flipShown}><i /></button>
              </div>
              <div className="jn-next">
                <Link href="/profile/edit"><Icon name="user" size={20} /><b>Finish your profile</b></Link>
                <Link href="/amenities"><Icon name="bed" size={20} /><b>Plan a stay</b></Link>
              </div>
              {error && <p className="jn-error" role="alert">{error}</p>}
            </main>
            <footer className="jn-foot">
              <Link href="/dashboard" className="jn-btn">Go to Dashboard</Link>
              <p className="jn-quiet">
                <a href="/about" target="_blank" rel="noopener">Our values</a>
                {me?.username && <><span aria-hidden="true"> · </span><button type="button" onClick={copyInvite}>{copied ? 'Invite link copied' : 'Invite someone'}</button></>}
              </p>
            </footer>
          </>
        )}
      </div>
    </div>
  )
}
