'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/core/lib/supabase/client'
import type { Booking, BookingCategory, BookingItem, BookingsTab, PersonLite } from './types'
import {
  CATEGORIES, CATEGORY_META, STATUS_META, bookingErrorMessage, canAddItems, canBook, canManageItem,
  fmtBookingRange, isHolding, personName,
} from './lib/inventory'
import { BOOKING_SELECT, ITEM_SELECT, toBooking, toItem } from './lib/queries'
import { ItemModal } from './ItemModal'
import { ItemFormModal, type ItemPayload } from './ItemFormModal'

export default function BookingsClient({
  initialItems, initialBookings, userId, me, role, leadCircles, initialTab, initialCategory, initialItemId,
}: {
  initialItems: BookingItem[]
  initialBookings: Booking[]
  userId: string | null
  me: PersonLite | null
  role: string
  leadCircles: string[]
  initialTab: BookingsTab
  initialCategory: BookingCategory | null
  initialItemId: string | null
}) {
  const supabase = createClient()
  const [items, setItems] = useState(initialItems)
  const [bookings, setBookings] = useState(initialBookings)
  const isManager = canAddItems(role)
  const [tab, setTab] = useState<BookingsTab>(initialTab === 'manage' && !isManager ? 'browse' : initialTab)
  const [category, setCategory] = useState<BookingCategory | null>(initialCategory)
  const [tag, setTag] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(initialItemId)
  const [form, setForm] = useState<{ existing: BookingItem | null } | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Times render in the viewer's zone, so wait for mount
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => setNow(new Date()), [])

  useEffect(() => {
    const params = new URLSearchParams()
    if (tab !== 'browse') params.set('tab', tab)
    if (category) params.set('category', category)
    if (openId) params.set('item', openId)
    const qs = params.toString()
    window.history.replaceState(null, '', `/bookings${qs ? `?${qs}` : ''}`)
  }, [tab, category, openId])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  const activeItems = items.filter(i => i.is_active)
  const itemById = useMemo(() => new Map(items.map(i => [i.id, i])), [items])
  const knownTags = useMemo(() => [...new Set(items.flatMap(i => i.tags))].sort(), [items])

  const inCategory = activeItems.filter(i => !category || i.category === category)
  const tagsHere = [...new Set(inCategory.flatMap(i => i.tags))].sort()
  const q = query.trim().toLowerCase()
  const shown = inCategory
    .filter(i => !tag || i.tags.includes(tag))
    .filter(i => !q || [i.name, i.description ?? '', i.location ?? '', ...i.tags].some(s => s.toLowerCase().includes(q)))
    .sort((a, b) => a.name.localeCompare(b.name))

  const myBookings = userId ? bookings.filter(b => b.user_id === userId) : []
  const myUpcoming = now ? myBookings.filter(b => isHolding(b) && new Date(b.ends_at) > now).sort((a, b) => a.starts_at.localeCompare(b.starts_at)) : []
  const myPast = now ? myBookings.filter(b => !myUpcoming.includes(b)).sort((a, b) => b.starts_at.localeCompare(a.starts_at)).slice(0, 20) : []
  const pending = bookings
    .filter(b => b.status === 'pending' && (() => { const it = itemById.get(b.item_id); return it && canManageItem(it, userId, role, leadCircles) })())
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))

  const openItem = openId ? itemById.get(openId) ?? null : null

  /** What's happening with an item right now — for the card footer. */
  function availability(item: BookingItem): { text: string; color: string } | null {
    if (!now || !userId || !canBook(role)) return null
    const holding = bookings.filter(b => b.item_id === item.id && isHolding(b) && new Date(b.ends_at) > now)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    const current = holding.find(b => new Date(b.starts_at) <= now)
    if (current) {
      return { text: `In use until ${new Date(current.ends_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`, color: '#b45309' }
    }
    if (holding.length) return { text: `Free now · next booking ${new Date(holding[0].starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`, color: '#16a34a' }
    return { text: 'Free now', color: '#16a34a' }
  }

  async function book(item: BookingItem, startsAt: Date, endsAt: Date, note: string): Promise<string | null> {
    if (!userId) return 'Sign in to book.'
    const { data, error } = await supabase.from('bookings')
      .insert({ item_id: item.id, user_id: userId, starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(), note: note || null })
      .select(BOOKING_SELECT).single()
    if (error) return bookingErrorMessage(error)
    setBookings(list => [...list, { ...toBooking(data), person: me }])
    return null
  }

  async function setStatus(b: Booking, status: Booking['status'], okMsg: string) {
    const { data, error } = await supabase.from('bookings').update({ status }).eq('id', b.id).select(BOOKING_SELECT)
    if (error || !data?.length) {
      setToast(error ? bookingErrorMessage(error) : 'That change didn’t save.')
      return
    }
    const saved = toBooking(data[0])
    setBookings(list => list.map(x => (x.id === saved.id ? saved : x)))
    setToast(okMsg)
  }

  async function saveItem(payload: ItemPayload): Promise<string | null> {
    const existing = form?.existing
    if (existing) {
      const { data, error } = await supabase.from('booking_items').update(payload).eq('id', existing.id).select(ITEM_SELECT)
      if (error) return bookingErrorMessage(error)
      if (!data?.length) return 'You can’t edit this item. Admins, and circle leads of its circle, can.'
      const saved = toItem(data[0])
      setItems(list => list.map(i => (i.id === saved.id ? saved : i)))
      setForm(null)
      setOpenId(saved.id)
      setToast('Item updated')
      return null
    }
    const { data, error } = await supabase.from('booking_items').insert({ ...payload, created_by: userId }).select(ITEM_SELECT).single()
    if (error) {
      return error.code === '42501'
        ? 'Circle leads can only add items to circles they lead, or with no circle.'
        : bookingErrorMessage(error)
    }
    const saved = toItem(data)
    setItems(list => [...list, saved])
    setForm(null)
    setTab('browse')
    setCategory(saved.category)
    setToast('Added to the inventory')
    return null
  }

  async function toggleActive(item: BookingItem) {
    const { data, error } = await supabase.from('booking_items').update({ is_active: !item.is_active }).eq('id', item.id).select(ITEM_SELECT)
    if (error || !data?.length) {
      setToast('That change didn’t save.')
      return
    }
    const saved = toItem(data[0])
    setItems(list => list.map(i => (i.id === saved.id ? saved : i)))
    setToast(saved.is_active ? 'Item restored' : 'Item archived — it’s hidden from members')
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    fontSize: 13, fontWeight: active ? 600 : 400, color: active ? 'var(--ink)' : 'var(--ink-3)',
    padding: '8px 14px', background: 'none', border: 'none',
    borderBottom: active ? '2px solid var(--m15)' : '2px solid transparent',
    cursor: 'pointer', marginBottom: -1, outline: 'none', whiteSpace: 'nowrap',
  })
  const pill = (active: boolean, color = 'var(--m15)'): React.CSSProperties => ({
    fontSize: 12.5, fontWeight: 600, borderRadius: 20, padding: '5px 12px', cursor: 'pointer', whiteSpace: 'nowrap',
    border: `1px solid ${active ? color : 'var(--rule)'}`, background: active ? color : 'var(--surface)', color: active ? '#fff' : 'var(--ink-2)',
  })
  const smallBtn = (primary: boolean, danger = false): React.CSSProperties => ({
    fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 'var(--radius)', cursor: 'pointer',
    border: primary ? 'none' : '1px solid var(--rule)',
    background: primary ? 'var(--m15)' : 'var(--surface)', color: primary ? '#fff' : danger ? '#dc2626' : 'var(--ink-2)',
  })

  function BookingRow({ b, actions }: { b: Booking; actions?: React.ReactNode }) {
    const item = itemById.get(b.item_id)
    const status = STATUS_META[b.status]
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 10, padding: '12px 14px' }}>
        <div style={{ fontSize: 22 }}>{item ? CATEGORY_META[item.category].emoji : '📦'}</div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <button onClick={() => item && setOpenId(item.id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 14, fontWeight: 700, color: 'var(--ink)', textAlign: 'left' }}>
            {item?.name ?? 'Removed item'}
          </button>
          <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>
            {item && now ? fmtBookingRange(b, item.category) : ''}
            {b.user_id !== userId && <> · {personName(b.person)}</>}
          </div>
          {b.note && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2, fontStyle: 'italic' }}>“{b.note}”</div>}
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: status.color }}>{status.label}</span>
        {actions}
      </div>
    )
  }

  return (
    <div className="ev-page" style={{ padding: '26px 32px 60px' }}>
      {/* ── Page head ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'color-mix(in srgb, var(--m15) 10%, var(--surface))', color: 'var(--m15)', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 20, marginBottom: 10 }}>
            Module 15 · Bookings
          </div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.1, margin: '0 0 8px' }}>
            Community commons
          </h1>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>
            {CATEGORIES.map(c => `${activeItems.filter(i => i.category === c).length} ${CATEGORY_META[c].label.toLowerCase()}`).join(' · ')}
          </p>
        </div>
        {isManager && (
          <button onClick={() => setForm({ existing: null })} style={{ fontSize: 13, fontWeight: 600, color: '#fff', background: 'var(--m15)', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer' }}>
            + Add item
          </button>
        )}
      </div>

      {!userId ? (
        <div style={{ fontSize: 13, color: 'var(--ink-2)', background: 'var(--bg-2)', border: '1px solid var(--rule)', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
          Browse what the community shares. <Link href="/auth/login" style={{ color: 'var(--m15)', fontWeight: 600 }}>Sign in</Link> to book.
        </div>
      ) : !canBook(role) && (
        <div style={{ fontSize: 13, color: 'var(--ink-2)', background: 'var(--bg-2)', border: '1px solid var(--rule)', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
          🔒 Joining members and above can book shared items. <Link href="/join" style={{ color: 'var(--m15)', fontWeight: 600 }}>Start joining →</Link>
        </div>
      )}

      {/* ── Tabs ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--rule)', marginBottom: 18, overflowX: 'auto' }}>
        <button onClick={() => setTab('browse')} style={tabStyle(tab === 'browse')}>Browse</button>
        {userId && (
          <button onClick={() => setTab('mine')} style={tabStyle(tab === 'mine')}>
            My bookings{myUpcoming.length > 0 && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: 'var(--m15)' }}>{myUpcoming.length}</span>}
          </button>
        )}
        {isManager && (
          <button onClick={() => setTab('manage')} style={tabStyle(tab === 'manage')}>
            Manage{pending.length > 0 && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: '#fff', background: '#d97706', borderRadius: 20, padding: '1px 7px' }}>{pending.length}</span>}
          </button>
        )}
      </div>

      {/* ── Browse ────────────────────────────────────────────────────── */}
      {tab === 'browse' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button onClick={() => { setCategory(null); setTag(null) }} style={pill(category === null)}>All</button>
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => { setCategory(c); setTag(null) }} style={pill(category === c, CATEGORY_META[c].color)}>
                  {CATEGORY_META[c].emoji} {CATEGORY_META[c].label}
                </button>
              ))}
            </div>
            <input
              value={query} onChange={e => setQuery(e.target.value)} placeholder="Search…" aria-label="Search the inventory"
              style={{ fontSize: 13, color: 'var(--ink)', background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 8, padding: '6px 10px', width: 200, maxWidth: '100%' }}
            />
          </div>
          {tagsHere.length > 0 && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 16 }}>
              {tagsHere.map(t => (
                <button key={t} onClick={() => setTag(tag === t ? null : t)} style={{
                  fontSize: 11.5, fontWeight: 600, borderRadius: 20, padding: '2px 9px', cursor: 'pointer',
                  border: `1px solid ${tag === t ? 'var(--m15)' : 'transparent'}`,
                  background: tag === t ? 'color-mix(in srgb, var(--m15) 12%, var(--surface))' : 'var(--bg-2)',
                  color: tag === t ? 'var(--m15)' : 'var(--ink-3)',
                }}>#{t}</button>
              ))}
            </div>
          )}

          {shown.length === 0 ? (
            <div style={{ background: 'var(--surface)', border: '1px dashed var(--rule)', borderRadius: 10, padding: '32px 20px', textAlign: 'center', fontSize: 13, color: 'var(--ink-3)' }}>
              {activeItems.length === 0
                ? isManager ? 'The inventory is empty. Add the first item with “+ Add item”.' : 'Nothing in the inventory yet — admins and circle leads add items here.'
                : 'Nothing matches that filter.'}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
              {shown.map(item => {
                const meta = CATEGORY_META[item.category]
                const avail = availability(item)
                return (
                  <button key={item.id} onClick={() => setOpenId(item.id)} style={{
                    textAlign: 'left', cursor: 'pointer', background: 'var(--surface)', border: '1px solid var(--rule)',
                    borderTop: `3px solid ${meta.color}`, borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: meta.color }}>{meta.emoji} {meta.label}</span>
                      {item.requires_approval && <span style={{ fontSize: 10, color: 'var(--ink-4)' }}>✋ approval</span>}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.3, overflowWrap: 'anywhere' }}>{item.name}</div>
                    {(item.location || item.capacity) && (
                      <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                        {item.location && <>📍 {item.location}</>}{item.location && item.capacity ? ' · ' : ''}{item.capacity && <>👥 {item.capacity}</>}
                      </div>
                    )}
                    {item.tags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {item.tags.slice(0, 4).map(t => <span key={t} style={{ fontSize: 10.5, color: 'var(--ink-3)', background: 'var(--bg-2)', borderRadius: 20, padding: '1px 7px' }}>#{t}</span>)}
                      </div>
                    )}
                    {avail && <div style={{ fontSize: 11.5, fontWeight: 600, color: avail.color, marginTop: 'auto', paddingTop: 4 }}>● {avail.text}</div>}
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── My bookings ───────────────────────────────────────────────── */}
      {tab === 'mine' && userId && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 10 }}>Upcoming</div>
            {myUpcoming.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>No upcoming bookings. <button onClick={() => setTab('browse')} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--m15)', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Browse the commons →</button></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {myUpcoming.map(b => (
                  <BookingRow key={b.id} b={b} actions={
                    <button onClick={() => setStatus(b, 'cancelled', 'Booking cancelled')} style={smallBtn(false, true)}>Cancel</button>
                  } />
                ))}
              </div>
            )}
          </div>
          {myPast.length > 0 && (
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 10 }}>Past and cancelled</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: 0.75 }}>
                {myPast.map(b => <BookingRow key={b.id} b={b} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Manage ────────────────────────────────────────────────────── */}
      {tab === 'manage' && isManager && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 10 }}>Requests waiting for you</div>
            {pending.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>No requests waiting.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pending.map(b => (
                  <BookingRow key={b.id} b={b} actions={
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setStatus(b, 'declined', 'Request declined')} style={smallBtn(false, true)}>Decline</button>
                      <button onClick={() => setStatus(b, 'confirmed', 'Booking approved')} style={smallBtn(true)}>Approve</button>
                    </div>
                  } />
                ))}
              </div>
            )}
          </div>

          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 10 }}>Inventory you can manage</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {items
                .filter(i => canManageItem(i, userId, role, leadCircles))
                .sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
                .map(i => (
                  <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 8, padding: '9px 12px', opacity: i.is_active ? 1 : 0.6 }}>
                    <span>{CATEGORY_META[i.category].emoji}</span>
                    <button onClick={() => setOpenId(i.id)} style={{ flex: 1, minWidth: 140, textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>
                      {i.name}{!i.is_active && <span style={{ fontSize: 11, color: '#dc2626', marginLeft: 6 }}>archived</span>}
                    </button>
                    <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{i.tags.map(t => `#${t}`).join(' ')}</span>
                    <button onClick={() => setForm({ existing: i })} style={smallBtn(false)}>Edit</button>
                    <button onClick={() => toggleActive(i)} style={smallBtn(false, i.is_active)}>{i.is_active ? 'Archive' : 'Restore'}</button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {openItem && now && !form && (
        <ItemModal
          key={openItem.id}
          item={openItem}
          bookings={bookings.filter(b => b.item_id === openItem.id)}
          now={now}
          userId={userId}
          role={role}
          canManage={canManageItem(openItem, userId, role, leadCircles)}
          onClose={() => setOpenId(null)}
          onBook={(s, e, note) => book(openItem, s, e, note)}
          onEdit={() => setForm({ existing: openItem })}
          onToggleActive={() => toggleActive(openItem)}
        />
      )}

      {form && (
        <ItemFormModal
          existing={form.existing}
          defaultCategory={category ?? 'tools'}
          role={role}
          leadCircles={leadCircles}
          knownTags={knownTags}
          onClose={() => setForm(null)}
          onSave={saveItem}
        />
      )}

      {toast && (
        <div role="status" style={{
          position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 10000,
          background: 'var(--ink)', color: 'var(--surface)', fontSize: 13, fontWeight: 600,
          padding: '10px 18px', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', maxWidth: 'calc(100vw - 32px)',
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}
