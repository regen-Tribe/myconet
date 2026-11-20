'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/core/lib/supabase/client'
import { useCircles } from '@/core/components/CirclesProvider'
import { CircleLeadName } from '@/core/components/CircleLeadName'
import { AddCircleButton } from '@/modules/m04-blueprint/AddCircleButton'
import { MeetingNotesLink } from '@/modules/m18-meetings/MeetingNotesLink'
import { PmLink } from '@/modules/m07-ops/PmLink'
import { Button, Icon, PageHeader, SectionHead, StatusPill, Tag, statusFromDb } from '@/core/components/v4'
import type { CircleSlug } from '@/core/lib/circles'
import type { CircleDirectory, PersonRef } from '@/core/lib/ops-permissions'
import type { OrgMember, OrgPerson, OrgUnit } from './types'
import type { JoinRequest } from './JoinRequests'
import { AddCircleMember } from './AddCircleMember'
import { canEditUnit, canLeadCircle } from './lib/org'

export type CircleProject = { id: string; title: string; status: string; circle: string | null }

type Props = {
  units: OrgUnit[]
  members: OrgMember[]
  directory: CircleDirectory
  people: OrgPerson[]
  userId: string | null
  role: string
  leadCircles: string[]
  meetingCounts?: Record<string, number> | null
  pmCounts?: Record<string, number>
  requests: JoinRequest[]
  teamProjects: { id: string; title: string; team_id: string }[]
  projects: CircleProject[]
  onEdit: (unit: OrgUnit | null, circle: CircleSlug) => void
  onMemberAdded: (m: OrgMember, circleLabel: string) => void
  onDecided: (id: string, approved: boolean) => void
}

const initial = (name: string) => name.trim().slice(0, 1).toUpperCase() || '?'

function Av({ name, color }: { name: string; color?: string }) {
  return <span className="v4-avatar cv4-av" style={color ? { background: `color-mix(in srgb, ${color} 22%, #fff)`, color: 'var(--ink, #111317)' } : undefined}>{initial(name)}</span>
}

/**
 * Circles in the v4 look (Sonia's prototype, pCircles / pCircle): a card per circle, and a page per circle
 * (/circles?c=slug) with who's asking to join, its members, teams and projects. Everything the classic org
 * chart lets people do is still here: Edit, + Add team, + Add member, accept or decline, the lead name,
 * meeting notes and the project manager.
 */
export default function CirclesV4(p: Props) {
  const circles = useCircles()
  const params = useSearchParams()
  const open = params.get('c')
  if (open && circles.has(open)) return <CirclePage {...p} slug={open} />
  return <CircleCards {...p} />
}

function useCircleFacts(p: Props) {
  const circleUnit = (c: string) => p.units.find(u => u.kind === 'circle' && u.circle === c)
  const teamsOf = (c: string) => p.units.filter(u => u.kind === 'team' && u.circle === c).sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
  const membersOf = (unitId: string) => p.members.filter(m => m.unit_id === unitId && m.person)
    .sort((a, b) => (a.role === b.role ? (a.person?.name ?? '').localeCompare(b.person?.name ?? '') : a.role === 'lead' ? -1 : 1))
  /** Leads first (from the directory), then the circle's members, each person once. */
  const peopleOf = (c: string) => {
    const cu = circleUnit(c)
    const leads: PersonRef[] = p.directory.leads[c] ?? []
    const out: { id: string; name: string; username: string | null; lead: boolean; title: string | null }[] =
      leads.map(l => ({ ...l, lead: true, title: null }))
    for (const m of cu ? membersOf(cu.id) : []) {
      if (!out.some(o => o.id === m.user_id)) out.push({ ...m.person!, lead: m.role === 'lead', title: m.title })
    }
    return out
  }
  const inCircle = (c: string) => !!p.userId && (canLeadCircle(c, p.role, p.leadCircles) && p.role !== 'admin' || peopleOf(c).some(x => x.id === p.userId)
    || teamsOf(c).some(t => p.members.some(m => m.unit_id === t.id && m.user_id === p.userId)))
  return { circleUnit, teamsOf, membersOf, peopleOf, inCircle }
}

function CircleCards(p: Props) {
  const circles = useCircles()
  const f = useCircleFacts(p)
  const steward = circles.list.find(c => c.is_steward) ?? null
  const order = [...(steward ? [steward.slug] : []), ...circles.slugs.filter(c => c !== steward?.slug)]
  const mine = order.filter(f.inCircle)

  return (
    <div className="v4-page v4-page--wide cv4">
      <PageHeader
        eyebrow="Community"
        title="Circles"
        subtitle={<>A circle looks after one area of community life. Teams are smaller groups inside a circle.{mine.length > 0 && <> You’re in <b>{mine.map(c => circles.meta(c).label).join(', ')}</b>.</>}</>}
        actions={p.role === 'admin' ? <AddCircleButton /> : undefined}
      />

      <div className="cv4-cards">
        {order.map(c => {
          const meta = circles.meta(c)
          const cu = f.circleUnit(c)
          const ppl = f.peopleOf(c)
          const leads = ppl.filter(x => x.lead)
          const leadName = circles.get(c)?.leads_to_assign
          const leadLine = leads.length ? leads.map(l => l.name.split(' ')[0]).join(', ') : leadName || null
          const teams = f.teamsOf(c)
          const asking = p.requests.filter(r => r.circle === c).length
          return (
            <Link key={c} href={`/circles?c=${encodeURIComponent(c)}`} className="v4-card v4-card--link cv4-card" style={{ ['--c' as string]: meta.color }}>
              <div className="v4-card-head">
                <span className="cv4-ico" aria-hidden="true">{meta.emoji || <Icon name="circles" />}</span>
                <div>
                  <b>{meta.label}</b>
                  <small>{[leadLine ? `lead ${leadLine}` : 'no lead yet', `${ppl.length} ${ppl.length === 1 ? 'member' : 'members'}`, teams.length ? `${teams.length} ${teams.length === 1 ? 'team' : 'teams'}` : null].filter(Boolean).join(' · ')}</small>
                </div>
              </div>
              {c === steward?.slug && <div className="v4-tags cv4-gap"><Tag icon="shield">Looks after every circle</Tag></div>}
              {cu?.description ? <p className="cv4-about">{cu.description}</p> : <p className="cv4-about v4-hint">No purpose written yet.</p>}
              <div className="cv4-foot">
                <span className="cv4-avs">{ppl.slice(0, 5).map(x => <Av key={x.id} name={x.name} color={meta.color} />)}{ppl.length > 5 && <span className="v4-avatar cv4-av cv4-more">+{ppl.length - 5}</span>}</span>
                <span className="v4-tags">
                  {asking > 0 && <Tag icon="hand">{asking} asking to join</Tag>}
                  {f.inCircle(c) && <Tag icon="check">You’re in it</Tag>}
                </span>
              </div>
            </Link>
          )
        })}
      </div>

      {p.directory.admins.length > 0 && (
        <>
          <SectionHead title="Admins" />
          <div className="v4-list cv4-admins">
            {p.directory.admins.map(a => (
              <Link key={a.id} href={a.username ? `/u/${a.username}` : '#'} className="v4-row v4-row--click">
                <span className="v4-row__lead"><Av name={a.name} /></span>
                <span className="v4-row__main"><b>{a.name}{a.id === p.userId ? ' (you)' : ''}</b><small>Admin · looks after every circle</small></span>
              </Link>
            ))}
          </div>
        </>
      )}

      <p className="v4-hint v4-mt">
        Admins edit everything. Circle leads edit their circle and its teams; team leads edit their own team.
        {!p.userId && <> <Link href="/auth/login">Sign in</Link> if you lead something.</>}
      </p>
    </div>
  )
}

function CirclePage(p: Props & { slug: string }) {
  const circles = useCircles()
  const router = useRouter()
  const f = useCircleFacts(p)
  const c = p.slug
  const meta = circles.meta(c)
  const cu = f.circleUnit(c)
  const ppl = f.peopleOf(c)
  const teams = f.teamsOf(c)
  const manage = canLeadCircle(c, p.role, p.leadCircles)
  const inIt = f.inCircle(c)
  const reqs = p.requests.filter(r => r.circle === c)
  const projects = p.projects.filter(x => x.circle === c)
  const steward = circles.list.find(x => x.is_steward)

  // Your own request to join this circle (members ask; leads answer)
  const [asked, setAsked] = useState<boolean | null>(null)
  const [asking, setAsking] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!p.userId || inIt) return
    let live = true
    createClient().from('circle_join_requests').select('id').eq('user_id', p.userId).eq('circle', c).eq('status', 'pending')
      .then(({ data }) => { if (live) setAsked(!!data?.length) })
    return () => { live = false }
  }, [p.userId, c, inIt])

  async function ask() {
    if (!p.userId) return
    setBusy('ask'); setError('')
    const { error: e } = await createClient().from('circle_join_requests').insert({ circle: c, user_id: p.userId, note: note.trim() || null })
    setBusy(null)
    if (e) { setError(e.message); return }
    setAsked(true); setAsking(false); setNote('')
  }
  async function withdraw() {
    if (!p.userId) return
    setBusy('ask')
    await createClient().from('circle_join_requests').delete().eq('user_id', p.userId).eq('circle', c).eq('status', 'pending')
    setBusy(null); setAsked(false)
  }
  async function decide(r: JoinRequest, approve: boolean) {
    setBusy(r.id); setError('')
    const { error: e } = await createClient().rpc('decide_circle_join', { p_request: r.id, p_approve: approve })
    setBusy(null)
    if (e) { setError(e.message); return }
    p.onDecided(r.id, approve)
  }

  const joinAction = !p.userId ? null
    : inIt ? <Tag icon="check">You’re a member</Tag>
    : asked ? <Button variant="secondary" onClick={withdraw} disabled={busy === 'ask'}>Asked · withdraw</Button>
    : asked === false ? <Button onClick={() => setAsking(a => !a)}>Ask to join</Button>
    : null

  return (
    <div className="v4-page v4-page--wide cv4" style={{ ['--c' as string]: meta.color }}>
      <Link href="/circles" className="v4-back" onClick={e => { if (!e.metaKey && !e.ctrlKey) { e.preventDefault(); router.push('/circles') } }}><Icon name="left" size={14} />Circles</Link>
      <header className="v4-ph">
        <div className="v4-ph__row">
          <div>
            <div className="v4-tags cv4-gap">
              <span className="v4-tag"><i className="cv4-dot" />{c === steward?.slug ? 'Stewards circle' : 'Circle'}</span>
              {manage && <Tag icon="shield">You can manage it</Tag>}
            </div>
            <h1 className="v4-ph__title">{meta.emoji ? `${meta.emoji} ` : ''}{meta.label}</h1>
            {cu?.description ? <p className="v4-ph__sub cv4-pre">{cu.description}</p> : manage && <p className="v4-ph__sub">Add this circle’s purpose with Edit.</p>}
          </div>
          <div className="v4-ph__actions">
            {manage && cu && <Button variant="secondary" icon="pencil" onClick={() => p.onEdit(cu, c)}>Edit</Button>}
            {joinAction}
          </div>
        </div>
      </header>

      {asking && (
        <div className="v4-card cv4-ask">
          <label className="v4-hint" htmlFor="cv4-note">A line for the {meta.label} leads (optional)</label>
          <div className="cv4-askrow">
            <input id="cv4-note" className="v4-input" value={note} onChange={e => setNote(e.target.value)} maxLength={500} placeholder="Why you’d like to join" />
            <Button onClick={ask} disabled={busy === 'ask'}>{busy === 'ask' ? 'Sending…' : 'Send'}</Button>
          </div>
        </div>
      )}
      {error && <p className="cv4-err" role="alert">{error}</p>}

      {(p.meetingCounts || p.pmCounts?.[c]) && (
        <div className="v4-tags cv4-links">
          {p.meetingCounts && <MeetingNotesLink circle={c} count={p.meetingCounts[c]} color={meta.color} />}
          <PmLink circle={c} count={p.pmCounts?.[c]} color={meta.color} />
        </div>
      )}

      <div className="cv4-split">
        <div>
          {manage && reqs.length > 0 && (
            <>
              <SectionHead title={`Asking to join · ${reqs.length}`} />
              <div className="v4-list">
                {reqs.map(r => (
                  <div key={r.id} className="v4-row cv4-wrap">
                    <span className="v4-row__lead"><Av name={r.name} color={meta.color} /></span>
                    <span className="v4-row__main"><b>{r.name}</b>{r.note && <small>“{r.note}”</small>}</span>
                    <span className="v4-row__trail cv4-acts">
                      <Button size="sm" onClick={() => decide(r, true)} disabled={!!busy}>{busy === r.id ? '…' : 'Accept'}</Button>
                      <Button size="sm" variant="secondary" onClick={() => decide(r, false)} disabled={!!busy}>Decline</Button>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          <SectionHead title={`Members · ${ppl.length}`} />
          <div className="cv4-leadname"><CircleLeadName slug={c} canEdit={p.role === 'admin'} color={meta.color} />
            {p.role === 'admin' && <Link href="/admin/users" className="cv4-small">Manage leads →</Link>}</div>
          {ppl.length ? (
            <div className="v4-list">
              {ppl.map(x => (
                <Link key={x.id} href={x.username ? `/u/${x.username}` : '#'} className="v4-row v4-row--click">
                  <span className="v4-row__lead"><Av name={x.name} color={meta.color} /></span>
                  <span className="v4-row__main"><b>{x.name}{x.id === p.userId ? ' (you)' : ''}</b><small>{x.lead ? 'Circle lead' : x.title || 'Member'}</small></span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="v4-hint">No one yet. {steward && steward.slug !== c ? `${circles.meta(steward.slug).label} looks after it.` : ''}</p>
          )}
          {manage && cu && (
            <div className="cv4-add">
              <AddCircleMember unitId={cu.id} color={meta.color} people={p.people}
                existing={[...f.membersOf(cu.id).map(m => m.user_id), ...(p.directory.leads[c] ?? []).map(l => l.id)]}
                onAdded={m => p.onMemberAdded(m, meta.label)} />
            </div>
          )}
        </div>

        <div>
          <div className="v4-sec"><h2>Teams</h2>{manage && <button type="button" className="cv4-link no-min-height" onClick={() => p.onEdit(null, c)}>+ Add team</button>}</div>
          {teams.length ? (
            <div className="v4-list">
              {teams.map(t => {
                const tm = f.membersOf(t.id)
                const tp = p.teamProjects.filter(x => x.team_id === t.id)
                return (
                  <div key={t.id} className="v4-row cv4-team">
                    <span className="v4-row__lead"><span className="v4-tile v4-tile--grey"><Icon name="users" /></span></span>
                    <span className="v4-row__main">
                      <b>{t.name}</b>
                      <small>{tm.length ? tm.map(m => `${m.user_id === p.userId ? 'you' : m.person!.name.split(' ')[0]}${m.title ? ` (${m.title})` : m.role === 'lead' ? ' (lead)' : ''}`).join(', ') : 'No one on this team yet'}</small>
                      {t.description && <small className="cv4-pre">{t.description}</small>}
                      {tp.length > 0 && <span className="v4-tags cv4-tp">{tp.map(x => <Link key={x.id} href={`/operations/${x.id}`} className="v4-tag">{x.title}</Link>)}</span>}
                    </span>
                    {canEditUnit(t, p.members, p.userId, p.role, p.leadCircles) && <span className="v4-row__trail"><button type="button" className="cv4-link no-min-height" onClick={() => p.onEdit(t, c)}>Edit</button></span>}
                  </div>
                )
              })}
            </div>
          ) : <p className="v4-hint">No teams yet.</p>}

          <SectionHead title="Projects" action={{ href: '/operations', label: 'Open Operations →' }} />
          {projects.length ? (
            <div className="v4-list">
              {projects.map(x => (
                <Link key={x.id} href={`/operations/${x.id}`} className="v4-row v4-row--click">
                  <span className="v4-row__main"><b>{x.title}</b></span>
                  <span className="v4-row__trail"><StatusPill status={statusFromDb(x.status)} /></span>
                </Link>
              ))}
            </div>
          ) : <p className="v4-hint">No projects yet.</p>}
        </div>
      </div>
    </div>
  )
}
