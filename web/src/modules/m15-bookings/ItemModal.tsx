'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ModalShell } from '@/core/components/ModalShell'
import { isPillar, PILLAR_META } from '@/core/lib/pillars'
import { ROLE_LABELS } from '@/core/lib/roles'
import type { Booking, BookingItem } from './types'
import {
  CATEGORY_META, canBook, fmtBookingRange, isHolding,
  localDateInput, localDateTimeInput, overlaps, personName,
} from './lib/inventory'

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
  onBook: (startsAt: Date, endsAt: Date, note: string) => Promise<string | null>
  onEdit: () => void
  onToggleActive: () => Promise<void>
}) {
  const meta = CATEGORY_META[item.category]
  const byNight = meta.unit === 'night'

  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1)
  const dayAfter = new Date(now); dayAfter.setDate(dayAfter.getDate() + 2)
  const startDefault = new Date(tomorrow); startDefault.setHours(10, 0, 0, 0)
  const endDefault = new Date(tomorrow); endDefault.setHours(12, 0, 0, 0)

  const [start, setStart] = useState(byNight ? localDateInput(tomorrow) : localDateTimeInput(startDefault))
  const [end, setEnd] = useState(byNight ? localDateInput(dayAfter) : localDateTimeInput(endDefault))
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
    if (!valid) return setError(byNight ? 'Check-out must be after check-in.' : 'The booking must end after it starts.')
    if (startsAt < new Date(now.getTime() - 3600000) && !byNight) return setError('That time has already passed.')
    if (clash) return setError(`That overlaps ${personName(clash.person)}’s booking (${fmtBookingRange(clash, item.category)}).`)
    setBusy(true)
    const err = await onBook(startsAt, endsAt, note.trim())
    setBusy(false)
    if (err) return setError(err)
    setDone(item.requires_approval
      ? 'Request sent. You’ll see it as confirmed under My bookings once a lead approves it.'
      : 'Booked! It’s in My bookings.')
  }

  return (
    <ModalShell title={<span>{meta.emoji} {item.name}</span>} onClose={onClose} maxWidth={560}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: meta.color, borderRadius: 20, padding: '2px 9px' }}>{meta.label}</span>
          {item.tags.map(t => (
            <span key={t} style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', background: 'var(--bg-2)', borderRadius: 20, padding: '2px 9px' }}>#{t}</span>
          ))}
          {isPillar(item.circle) && (
            <span style={{ fontSize: 11, fontWeight: 700, color: PILLAR_META[item.circle].color }}>{PILLAR_META[item.circle].emoji} {PILLAR_META[item.circle].label}</span>
          )}
          {!item.is_active && <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626' }}>Archived</span>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13.5, color: 'var(--ink-2)' }}>
          {item.location && <div>📍 {item.location}</div>}
          {item.capacity && <div>👥 Up to {item.capacity} {item.capacity === 1 ? 'person' : 'people'}</div>}
          <div>{item.requires_approval ? '✋ Bookings need a lead’s approval' : '⚡ Bookings confirm instantly'}</div>
        </div>

        {item.description && (
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink-2)', margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{item.description}</p>
        )}

        <div>
          <div style={sectionLabel}>Booked times</div>
          {!userId ? (
            <div style={{ fontSize: 13, color: 'var(--ink-3)' }}><Link href="/auth/login" style={{ color: 'var(--m15)', fontWeight: 600 }}>Sign in</Link> to see when it’s free and book it.</div>
          ) : !canBook(role) && upcoming.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>The schedule is visible to joining members and above.</div>
          ) : upcoming.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Nothing booked — it’s free.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {upcoming.map(b => (
                <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12.5, background: 'var(--bg-2)', borderRadius: 8, padding: '7px 10px' }}>
                  <span style={{ color: 'var(--ink-2)' }}>{fmtBookingRange(b, item.category)}</span>
                  <span style={{ color: b.user_id === userId ? 'var(--m15)' : 'var(--ink-3)', fontWeight: 600, flexShrink: 0 }}>
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
                  <div style={{ fontSize: 12.5, color: '#b45309' }}>⚠ Overlaps {personName(clash.person)}’s booking ({fmtBookingRange(clash, item.category)}).</div>
                )}
                {error && <div style={{ fontSize: 13, color: '#dc2626', background: 'color-mix(in srgb, #dc2626 8%, var(--surface))', borderRadius: 8, padding: '8px 10px' }}>{error}</div>}
                <button type="submit" disabled={busy || !!clash} style={{
                  alignSelf: 'flex-start', fontSize: 13, fontWeight: 600, padding: '9px 18px', borderRadius: 'var(--radius)', border: 'none',
                  background: 'var(--m15)', color: '#fff', cursor: busy || clash ? 'not-allowed' : 'pointer', opacity: busy || clash ? 0.6 : 1,
                }}>
                  {busy ? 'Booking…' : item.requires_approval ? 'Send request' : 'Book'}
                </button>
              </form>
            )
          ) : (
            <div style={{ fontSize: 13, color: 'var(--ink-2)', background: 'var(--bg-2)', borderRadius: 10, padding: '10px 12px', lineHeight: 1.5 }}>
              🔒 Joining members and above can book shared items. You’re a {ROLE_LABELS[role] ?? 'Explorer'}.{' '}
              <Link href="/join" style={{ color: 'var(--m15)', fontWeight: 600 }}>Start joining →</Link>
            </div>
          )
        )}

        {canManage && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--rule)', paddingTop: 14 }}>
            <button onClick={onToggleActive} style={{ fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--rule)', background: 'var(--surface)', color: item.is_active ? '#dc2626' : 'var(--ink-2)', cursor: 'pointer' }}>
              {item.is_active ? 'Archive' : 'Restore'}
            </button>
            <button onClick={onEdit} style={{ fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--m15)', color: '#fff', cursor: 'pointer' }}>
              Edit item
            </button>
          </div>
        )}
      </div>
    </ModalShell>
  )
}

