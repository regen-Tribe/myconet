'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ModalShell } from '@/core/components/ModalShell'
import { useCircles } from '@/core/components/CirclesProvider'
import { ROLE_LABELS } from '@/core/lib/roles'
import type { Booking, BookingItem } from './types'
import {
  CATEGORY_META, canBook, fmtBookingRange, isHolding,
  localDateInput, localDateTimeInput, overlaps, personName,
} from './lib/inventory'
import { DESIGN, DESIGN_REVIEW } from '@/core/lib/instance'
import { tagLabel } from './lib/tag-labels'
import { Button, Icon, IconTile, InlineIcon, StatusPill, Tag } from '@/core/components/v4'
import { CATEGORY_ICON } from './BookingsV4'
import { PhotoStrip } from '@/core/components/PhotoStrip'
import { StayCalendar } from './StayCalendar'
import { STAY_RULES, estimateStay, fmtMoney, ratesFor } from './lib/pricing'

const sectionLabel: React.CSSProperties = {
  fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
  color: 'var(--ink-4)', marginBottom: 8,
}
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }
const inputStyle: React.CSSProperties = {
  width: '100%', fontSize: 14, color: 'var(--ink)', background: 'var(--bg)', border: '1px solid var(--rule)',
  borderRadius: 'var(--radius)', padding: '8px 10px', outline: 'none', boxSizing: 'border-box',
}

export function ItemModal({
  item, bookings, now, userId, role, canManage, onClose, onBook, onEdit, onToggleActive,
}: {
  item: BookingItem
  /** All visible bookings for this item. */
  bookings: Booking[]
  now: Date
  userId: string | null
  role: string
  canManage: boolean
  onClose: () => void
  /** Resolves to an error message, or null on success. */
  onBook: (startsAt: Date, endsAt: Date, note: string, guests: number) => Promise<string | null>
  onEdit: () => void
  onToggleActive: () => Promise<void>
}) {
  const circles = useCircles()
  const meta = CATEGORY_META[item.category]
  const byNight = meta.unit === 'night'

  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1)
  const dayAfter = new Date(now); dayAfter.setDate(dayAfter.getDate() + 2)
  const startDefault = new Date(tomorrow); startDefault.setHours(10, 0, 0, 0)
  const endDefault = new Date(tomorrow); endDefault.setHours(12, 0, 0, 0)

  // A stay's dates are picked on the availability calendar (v4), so they start empty
  const onCalendar = byNight && DESIGN === 'v4'
  const [start, setStart] = useState(onCalendar ? '' : byNight ? localDateInput(tomorrow) : localDateTimeInput(startDefault))
  const [end, setEnd] = useState(onCalendar ? '' : byNight ? localDateInput(dayAfter) : localDateTimeInput(endDefault))
  const [guests, setGuests] = useState(1)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<string | null>(null)

  const upcoming = bookings
    .filter(b => isHolding(b) && new Date(b.ends_at) > now)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))

  // Accommodation runs midnight to midnight, so back-to-back stays don't clash
  const startsAt = byNight ? new Date(`${start}T00:00`) : new Date(start)
  const endsAt = byNight ? new Date(`${end}T00:00`) : new Date(end)
  const valid = !Number.isNaN(startsAt.getTime()) && !Number.isNaN(endsAt.getTime()) && endsAt > startsAt
  const clash = valid ? upcoming.find(b => overlaps(startsAt, endsAt, new Date(b.starts_at), new Date(b.ends_at))) : undefined

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (onCalendar && (!start || !end)) return setError('Pick your check-in and check-out days on the calendar.')
    if (!valid) return setError(byNight ? 'Check-out must be after check-in.' : 'The booking must end after it starts.')
    if (startsAt < new Date(now.getTime() - 3600000) && !byNight) return setError('That time has already passed.')
    if (clash && onCalendar) return setError('Those dates include nights that are taken. Pick other dates.')
    if (clash) return setError(`That overlaps ${personName(clash.person)}’s booking (${fmtBookingRange(clash, item.category)}).`)
    setBusy(true)
    const err = await onBook(startsAt, endsAt, note.trim(), byNight ? guests : 1)
    setBusy(false)
    if (err) return setError(err)
    setDone(item.requires_approval
      ? 'Request sent. You’ll see it as confirmed under My bookings once a lead approves it.'
      : 'Booked! It’s in My bookings.')
  }

  // The v4 look: same rules, checks and messages, the shared building blocks
  if (DESIGN === 'v4') {
    const ci = CATEGORY_ICON[item.category]
    const prices = byNight ? item.stay_prices ?? null : null
    const one = ratesFor(prices, 1)
    const two = prices?.two ? ratesFor(prices, 2) : null
    const rateLine = (r: NonNullable<typeof one>) => [
      r.night !== undefined && `${fmtMoney(r.night)} a night`, r.week !== undefined && `${fmtMoney(r.week)} a week`, r.month !== undefined && `${fmtMoney(r.month)} a month`,
    ].filter(Boolean).join(' · ')
    const estimate = onCalendar && valid ? estimateStay(ratesFor(prices, guests), startsAt, endsAt) : null
    const dayLabel = (v: string) => new Date(`${v}T00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    const canSee = !!userId && canBook(role)
    return (
      <ModalShell title={<span className="v4-modal-title"><IconTile name={ci.icon} tone={ci.tone} />{item.name}</span>} onClose={onClose} maxWidth={560}>
        <div className="v4-modal">
          <PhotoStrip className="v4-modal__photo" alt={item.name} photos={
            // Its own photos; without any, its place's
            (item.photo_url || item.photos?.length
              ? [item.photo_url, ...(item.photos ?? [])]
              : [item.place?.photo_url, ...(item.place?.photos ?? [])]).filter((p): p is string => !!p)
          } />
          <div className="v4-tags">
            <Tag>{meta.label}</Tag>
            {circles.has(item.circle) && <Tag><span className="v4-dot" style={{ background: circles.meta(item.circle).color }} />{circles.meta(item.circle).label}</Tag>}
            {item.tags.map(t => <Tag key={t}>{DESIGN_REVIEW ? tagLabel(t) : t}</Tag>)}
            {!item.is_active && <StatusPill status="paused" label="Archived" />}
          </div>

          <ul className="v4-facts-list">
            {item.place
              ? <li><Icon name="pin" size={16} /><Link href={`/map?place=${encodeURIComponent(item.place.slug)}`}>{item.location ?? item.place.name} · see it on the map</Link></li>
              : item.location && <li><Icon name="pin" size={16} />{item.location}</li>}
            {item.capacity && <li><Icon name="users" size={16} />Up to {item.capacity} {item.capacity === 1 ? 'person' : 'people'}</li>}
            <li><Icon name={item.requires_approval ? 'hand' : 'check'} size={16} />{item.requires_approval ? 'Bookings need a lead’s approval' : 'Bookings confirm instantly'}</li>
          </ul>

          {item.description && <p className="v4-prose">{item.description}</p>}

          {prices && (one || two) && (
            <div>
              <div className="v4-eyebrow">Prices{STAY_RULES.vatPercent ? ` · before ${STAY_RULES.vatPercent}% tax` : ''}</div>
              {one && (
                <div className="stay-rates">
                  {one.night !== undefined && <div><b>{fmtMoney(one.night)}</b><small>a night</small></div>}
                  {one.week !== undefined && <div><b>{fmtMoney(one.week)}</b><small>a week</small></div>}
                  {one.month !== undefined && <div><b>{fmtMoney(one.month)}</b><small>a month</small></div>}
                </div>
              )}
              {(two || STAY_RULES.longStay.length > 0 || STAY_RULES.notes.length > 0) && (
                <ul className="stay-notes">
                  {two && <li>For two people sharing: {rateLine(two)}</li>}
                  {STAY_RULES.longStay.length > 0 && <li>Longer stays: {STAY_RULES.longStay.map(t => `${t.percent}% off from ${t.months} month${t.months === 1 ? '' : 's'}`).join(' · ')}</li>}
                  {STAY_RULES.notes.map(n => <li key={n}>{n}</li>)}
                </ul>
              )}
            </div>
          )}

          {onCalendar ? (
            <div>
              <div className="v4-eyebrow">Availability</div>
              {!userId ? (
                <p className="v4-hint"><Link href="/auth/login">Sign in</Link> to see when it’s free and book it.</p>
              ) : !canSee ? (
                <p className="v4-hint">You’ll see which nights are free once you’ve joined.</p>
              ) : (
                <StayCalendar today={now} checkIn={start} checkOut={end}
                  stays={upcoming.map(b => ({ starts_at: b.starts_at, ends_at: b.ends_at, mine: b.user_id === userId }))}
                  onChange={(a, b) => { setStart(a); setEnd(b); setError(null) }} />
              )}
              {canManage && upcoming.length > 0 && (
                <details className="v4-modal__section">
                  <summary className="v4-hint" style={{ cursor: 'pointer' }}>Who’s staying · {upcoming.length} (only you and other managers see names)</summary>
                  <ul className="v4-slots" style={{ marginTop: 8 }}>
                    {upcoming.map(b => (
                      <li key={b.id}>
                        <span>{fmtBookingRange(b, item.category)}</span>
                        <b>{personName(b.person)}{(b.guests ?? 1) > 1 ? ` + ${(b.guests ?? 1) - 1}` : ''}{b.status === 'pending' ? ' · waiting' : ''}</b>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          ) : (
          <div>
            <div className="v4-eyebrow">Booked times</div>
            {!userId ? (
              <p className="v4-hint"><Link href="/auth/login">Sign in</Link> to see when it’s free and book it.</p>
            ) : !canBook(role) && upcoming.length === 0 ? (
              <p className="v4-hint">The schedule is visible to joining members and above.</p>
            ) : upcoming.length === 0 ? (
              <p className="v4-hint">Nothing booked: it’s free.</p>
            ) : (
              <ul className="v4-slots">
                {upcoming.map(b => (
                  <li key={b.id}>
                    <span>{fmtBookingRange(b, item.category)}</span>
                    <b className={b.user_id === userId ? 'v4-slots__you' : undefined}>{b.user_id === userId ? 'You' : personName(b.person)}{b.status === 'pending' ? ' · waiting' : ''}</b>
                  </li>
                ))}
              </ul>
            )}
          </div>
          )}

          {userId && item.is_active && (
            canBook(role) ? (
              done ? (
                <div className="v4-done"><Icon name="check" size={18} /><span>{done}</span></div>
              ) : (
                <form onSubmit={submit} className="v4-form v4-modal__section">
                  <div className="v4-eyebrow">{item.requires_approval ? 'Request a booking' : 'Book it'}</div>
                  {onCalendar ? (
                    <>
                      <div className="stay-dates">
                        <div><small>Check-in</small><b className={start ? undefined : 'is-empty'}>{start ? dayLabel(start) : 'Pick on the calendar'}</b></div>
                        <div><small>Check-out</small><b className={end ? undefined : 'is-empty'}>{end ? dayLabel(end) : start ? 'Pick on the calendar' : '–'}</b></div>
                      </div>
                      {(item.capacity ?? 1) >= 2 && (
                        <div className="v4-field">
                          <span>How many people</span>
                          <div className="v4-chiprow">
                            {Array.from({ length: Math.min(item.capacity ?? 1, 8) }, (_, i) => (
                              <button key={i + 1} type="button" className={`v4-chip${guests === i + 1 ? ' v4-chip--on' : ''}`} aria-pressed={guests === i + 1} onClick={() => setGuests(i + 1)}>{i + 1}</button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                  <div className="v4-form__row">
                    <label className="v4-field">
                      <span>{byNight ? 'Check-in' : 'From'}</span>
                      <input className="v4-input" type={byNight ? 'date' : 'datetime-local'} value={start} onChange={e => setStart(e.target.value)} />
                    </label>
                    <label className="v4-field">
                      <span>{byNight ? 'Check-out' : 'Until'}</span>
                      <input className="v4-input" type={byNight ? 'date' : 'datetime-local'} value={end} min={start} onChange={e => setEnd(e.target.value)} />
                    </label>
                  </div>
                  )}
                  <label className="v4-field">
                    <span>Note <small>optional</small></span>
                    <input className="v4-input" value={note} onChange={e => setNote(e.target.value)} placeholder={byNight ? 'Who’s staying?' : 'What’s it for?'} />
                  </label>
                  {estimate && (
                    <div className="stay-total">
                      {estimate.lines.map(l => <div key={l.label} className="stay-total__row"><span>{l.label}</span><span>{fmtMoney(l.amount)}</span></div>)}
                      {estimate.discount && <div className="stay-total__row stay-total__row--off"><span>{estimate.discount.percent}% off for {estimate.discount.months}+ months</span><span>−{fmtMoney(estimate.discount.amount)}</span></div>}
                      {estimate.vat && <div className="stay-total__row"><span>Tax {estimate.vat.percent}%</span><span>{fmtMoney(estimate.vat.amount)}</span></div>}
                      <div className="stay-total__row stay-total__row--sum"><span>Estimated total · {estimate.nights} night{estimate.nights === 1 ? '' : 's'}</span><span>{fmtMoney(estimate.total)}</span></div>
                      <small>An estimate. {item.requires_approval ? 'Whoever approves your stay confirms the price with you.' : 'The team confirms the price with you.'} Nothing is charged here.</small>
                    </div>
                  )}
                  {clash && !error && <p className="v4-warn"><Icon name="alert" size={16} />{onCalendar ? 'Those dates include nights that are taken.' : <>Overlaps {personName(clash.person)}’s booking ({fmtBookingRange(clash, item.category)}).</>}</p>}
                  {error && <p className="v4-error-box">{error}</p>}
                  <div><Button type="submit" disabled={busy || !!clash || (onCalendar && !valid)}>{busy ? 'Booking…' : item.requires_approval ? 'Send request' : 'Book'}</Button></div>
                </form>
              )
            ) : (
              <div className="v4-note v4-card"><Icon name="lock" /><span>Joining members and above can book. You’re {ROLE_LABELS[role] ? `a ${ROLE_LABELS[role].toLowerCase()}` : 'an explorer'}. <Link href="/join">Start joining →</Link></span></div>
            )
          )}

          {canManage && (
            <div className="v4-modal__foot">
              <Button variant={item.is_active ? 'danger' : 'secondary'} size="sm" onClick={() => { void onToggleActive() }}>{item.is_active ? 'Archive' : 'Restore'}</Button>
              <Button size="sm" icon="pencil" onClick={onEdit}>Edit item</Button>
            </div>
          )}
        </div>
      </ModalShell>
    )
  }

  return (
    <ModalShell title={<span><InlineIcon name={meta.icon} />{item.name}</span>} onClose={onClose} maxWidth={560}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: meta.color, borderRadius: 20, padding: '2px 9px' }}>{meta.label}</span>
          {item.tags.map(t => (
            <span key={t} style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', background: 'var(--bg-2)', borderRadius: 20, padding: '2px 9px' }}>#{t}</span>
          ))}
          {circles.has(item.circle) && (
            <span style={{ fontSize: 11, fontWeight: 700, color: circles.meta(item.circle).color }}>{circles.meta(item.circle).emoji} {circles.meta(item.circle).label}</span>
          )}
          {!item.is_active && <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626' }}>Archived</span>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13.5, color: 'var(--ink-2)' }}>
          {item.location && <div><InlineIcon name="pin" />{item.location}</div>}
          {item.capacity && <div><InlineIcon name="users" />Up to {item.capacity} {item.capacity === 1 ? 'person' : 'people'}</div>}
          <div><InlineIcon name={item.requires_approval ? 'hand' : 'check-circle'} />{item.requires_approval ? 'Bookings need a lead’s approval' : 'Bookings confirm instantly'}</div>
        </div>

        {item.description && (
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink-2)', margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{item.description}</p>
        )}

        <div>
          <div style={sectionLabel}>Booked times</div>
          {!userId ? (
            <div style={{ fontSize: 13, color: 'var(--ink-3)' }}><Link href="/auth/login" style={{ color: 'var(--bk-accent)', fontWeight: 600 }}>Sign in</Link> to see when it’s free and book it.</div>
          ) : !canBook(role) && upcoming.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>The schedule is visible to joining members and above.</div>
          ) : upcoming.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Nothing booked — it’s free.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {upcoming.map(b => (
                <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12.5, background: 'var(--bg-2)', borderRadius: 8, padding: '7px 10px' }}>
                  <span style={{ color: 'var(--ink-2)' }}>{fmtBookingRange(b, item.category)}</span>
                  <span style={{ color: b.user_id === userId ? 'var(--bk-accent)' : 'var(--ink-3)', fontWeight: 600, flexShrink: 0 }}>
                    {b.user_id === userId ? 'You' : personName(b.person)}{b.status === 'pending' ? ' · pending' : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {userId && item.is_active && (
          canBook(role) ? (
            done ? (
              <div style={{ fontSize: 13.5, color: '#15803d', background: 'color-mix(in srgb, #22c55e 10%, var(--surface))', borderRadius: 10, padding: '12px 14px', lineHeight: 1.5 }}>✓ {done}</div>
            ) : (
              <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid var(--rule)', paddingTop: 16 }}>
                <div style={sectionLabel}>{item.requires_approval ? 'Request a booking' : 'Book it'}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
                  <div>
                    <label style={labelStyle} htmlFor="bk-start">{byNight ? 'Check-in' : 'From'}</label>
                    <input id="bk-start" type={byNight ? 'date' : 'datetime-local'} value={start} onChange={e => setStart(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle} htmlFor="bk-end">{byNight ? 'Check-out' : 'Until'}</label>
                    <input id="bk-end" type={byNight ? 'date' : 'datetime-local'} value={end} min={start} onChange={e => setEnd(e.target.value)} style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle} htmlFor="bk-note">Note <span style={{ fontWeight: 400, color: 'var(--ink-4)' }}>(optional)</span></label>
                  <input id="bk-note" value={note} onChange={e => setNote(e.target.value)} style={inputStyle} placeholder={byNight ? 'Who’s staying?' : 'What’s it for?'} />
                </div>
                {clash && !error && (
                  <div style={{ fontSize: 12.5, color: '#b45309' }}><InlineIcon name="alert" />Overlaps {personName(clash.person)}’s booking ({fmtBookingRange(clash, item.category)}).</div>
                )}
                {error && <div style={{ fontSize: 13, color: '#dc2626', background: 'color-mix(in srgb, #dc2626 8%, var(--surface))', borderRadius: 8, padding: '8px 10px' }}>{error}</div>}
                <button type="submit" disabled={busy || !!clash} style={{
                  alignSelf: 'flex-start', fontSize: 13, fontWeight: 600, padding: '9px 18px', borderRadius: 'var(--radius)', border: 'none',
                  background: 'var(--bk-accent)', color: '#fff', cursor: busy || clash ? 'not-allowed' : 'pointer', opacity: busy || clash ? 0.6 : 1,
                }}>
                  {busy ? 'Booking…' : item.requires_approval ? 'Send request' : 'Book'}
                </button>
              </form>
            )
          ) : (
            <div style={{ fontSize: 13, color: 'var(--ink-2)', background: 'var(--bg-2)', borderRadius: 10, padding: '10px 12px', lineHeight: 1.5 }}>
              <InlineIcon name="lock" />Joining members and above can book shared items. You’re a {ROLE_LABELS[role] ?? 'Explorer'}.{' '}
              <Link href="/join" style={{ color: 'var(--bk-accent)', fontWeight: 600 }}>Start joining →</Link>
            </div>
          )
        )}

        {canManage && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--rule)', paddingTop: 14 }}>
            <button onClick={onToggleActive} style={{ fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--rule)', background: 'var(--surface)', color: item.is_active ? '#dc2626' : 'var(--ink-2)', cursor: 'pointer' }}>
              {item.is_active ? 'Archive' : 'Restore'}
            </button>
            <button onClick={onEdit} style={{ fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--bk-accent)', color: '#fff', cursor: 'pointer' }}>
              Edit item
            </button>
          </div>
        )}
      </div>
    </ModalShell>
  )
}

