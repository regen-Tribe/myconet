'use client'

import { useState } from 'react'
import { ModalShell } from '@/core/components/ModalShell'
import { PILLARS, PILLAR_META, type Pillar } from '@/core/lib/pillars'
import type { BookingCategory, BookingItem } from './types'
import { CATEGORY_META } from './lib/inventory'

export interface ItemPayload {
  name: string
  description: string | null
  category: BookingCategory
  tags: string[]
  circle: Pillar | null
  location: string | null
  capacity: number | null
  requires_approval: boolean
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }
const inputStyle: React.CSSProperties = {
  width: '100%', fontSize: 14, color: 'var(--ink)', background: 'var(--bg)', border: '1px solid var(--rule)',
  borderRadius: 'var(--radius)', padding: '8px 10px', outline: 'none', boxSizing: 'border-box',
}

const normalizeTag = (t: string) => t.trim().toLowerCase().replace(/^#/, '').replace(/\s+/g, ' ').slice(0, 30)

export function ItemFormModal({
  existing, defaultCategory, categories, role, leadCircles, knownTags, onClose, onSave,
}: {
  existing: BookingItem | null
  defaultCategory: BookingCategory
  /** Categories this page offers (accommodation, or tools + spaces). */
  categories: BookingCategory[]
  role: string
  leadCircles: string[]
  /** Tags already used in the inventory, offered as suggestions. */
  knownTags: string[]
  onClose: () => void
  onSave: (payload: ItemPayload) => Promise<string | null>
}) {
  const [name, setName] = useState(existing?.name ?? '')
  const [category, setCategory] = useState<BookingCategory>(existing?.category ?? defaultCategory)
  const [tags, setTags] = useState<string[]>(existing?.tags ?? [])
  const [tagInput, setTagInput] = useState('')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [location, setLocation] = useState(existing?.location ?? '')
  const [capacity, setCapacity] = useState(existing?.capacity ? String(existing.capacity) : '')
  const [circle, setCircle] = useState<Pillar | ''>((existing?.circle as Pillar) ?? '')
  const [requiresApproval, setRequiresApproval] = useState(existing?.requires_approval ?? category === 'accommodation')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Circle leads can only place items in circles they lead (or no circle)
  const circleAllowed = (c: Pillar) => role === 'admin' || leadCircles.includes(c) || existing?.circle === c
  const suggestions = [...new Set([...CATEGORY_META[category].suggestedTags, ...knownTags])].filter(t => !tags.includes(t)).slice(0, 10)

  function addTag(raw: string) {
    const parts = raw.split(',').map(normalizeTag).filter(Boolean)
    if (parts.length) setTags(list => [...new Set([...list, ...parts])].slice(0, 12))
    setTagInput('')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) return setError('Give the item a name.')
    const cap = capacity.trim() ? Number(capacity) : null
    if (cap !== null && (!Number.isInteger(cap) || cap < 1)) return setError('Capacity should be a whole number of people.')
    const allTags = tagInput.trim() ? [...new Set([...tags, ...tagInput.split(',').map(normalizeTag).filter(Boolean)])] : tags
    setSaving(true)
    const err = await onSave({
      name: name.trim(),
      description: description.trim() || null,
      category,
      tags: allTags,
      circle: circle || null,
      location: location.trim() || null,
      capacity: cap,
      requires_approval: requiresApproval,
    })
    setSaving(false)
    if (err) setError(err)
  }

  const chip = (active: boolean, color: string): React.CSSProperties => ({
    fontSize: 12, fontWeight: 600, borderRadius: 20, padding: '5px 12px', cursor: 'pointer',
    border: `1px solid ${active ? color : 'var(--rule)'}`, background: active ? color : 'var(--surface)', color: active ? '#fff' : color,
  })

  return (
    <ModalShell title={existing ? 'Edit item' : 'Add to the inventory'} onClose={onClose} maxWidth={560}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={labelStyle} htmlFor="it-name">Name</label>
          <input id="it-name" value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="Guest cabin, chainsaw, common kitchen…" autoFocus />
        </div>

        <div>
          <span style={labelStyle}>Category</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {categories.map(c => (
              <button key={c} type="button" onClick={() => setCategory(c)} style={chip(category === c, CATEGORY_META[c].color)}>
                {CATEGORY_META[c].emoji} {CATEGORY_META[c].label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 6 }}>
            {CATEGORY_META[category].unit === 'night' ? 'Booked by the night (check-in and check-out dates).' : 'Booked by the hour (start and end time).'}
          </div>
        </div>

        <div>
          <label style={labelStyle} htmlFor="it-tags">Tags</label>
          {tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {tags.map(t => (
                <button key={t} type="button" onClick={() => setTags(list => list.filter(x => x !== t))} title="Remove tag" style={{
                  fontSize: 12, fontWeight: 600, color: 'var(--bk-accent)', background: 'color-mix(in srgb, var(--bk-accent) 10%, var(--surface))',
                  border: '1px solid color-mix(in srgb, var(--bk-accent) 35%, var(--rule))', borderRadius: 20, padding: '3px 10px', cursor: 'pointer',
                }}>#{t} ×</button>
              ))}
            </div>
          )}
          <input
            id="it-tags" value={tagInput} onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput) } }}
            onBlur={() => tagInput.trim() && addTag(tagInput)}
            style={inputStyle} placeholder="Type a tag and press Enter"
          />
          {suggestions.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
              {suggestions.map(t => (
                <button key={t} type="button" onClick={() => addTag(t)} style={{ fontSize: 11.5, color: 'var(--ink-3)', background: 'var(--bg-2)', border: '1px dashed var(--rule)', borderRadius: 20, padding: '2px 9px', cursor: 'pointer' }}>
                  + {t}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label style={labelStyle} htmlFor="it-desc">Description</label>
          <textarea id="it-desc" value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55 }} placeholder="What it is, how to use it, where the key is…" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
          <div>
            <label style={labelStyle} htmlFor="it-loc">Location</label>
            <input id="it-loc" value={location} onChange={e => setLocation(e.target.value)} style={inputStyle} placeholder="Tool shed, north field…" />
          </div>
          <div>
            <label style={labelStyle} htmlFor="it-cap">Capacity <span style={{ fontWeight: 400, color: 'var(--ink-4)' }}>(people, optional)</span></label>
            <input id="it-cap" value={capacity} onChange={e => setCapacity(e.target.value)} style={inputStyle} inputMode="numeric" placeholder="4" />
          </div>
        </div>

        <div>
          <span style={labelStyle}>Circle <span style={{ fontWeight: 400, color: 'var(--ink-4)' }}>(who looks after it)</span></span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <button type="button" onClick={() => setCircle('')} style={chip(circle === '', 'var(--ink-2)')}>None</button>
            {PILLARS.map(p => {
              const ok = circleAllowed(p)
              return (
                <button
                  key={p} type="button" disabled={!ok}
                  onClick={() => setCircle(p)}
                  title={ok ? undefined : 'You can only add items to circles you lead.'}
                  style={{ ...chip(circle === p, PILLAR_META[p].color), opacity: ok ? 1 : 0.4, cursor: ok ? 'pointer' : 'not-allowed' }}
                >
                  {PILLAR_META[p].emoji} {PILLAR_META[p].label}
                </button>
              )
            })}
          </div>
          {role === 'circle_lead' && (
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 6 }}>You can add items to circles you lead. Items with no circle can be managed by any circle lead.</div>
          )}
        </div>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer', lineHeight: 1.45 }}>
          <input type="checkbox" checked={requiresApproval} onChange={e => setRequiresApproval(e.target.checked)} style={{ marginTop: 3 }} />
          <span><strong>Bookings need approval</strong> — requests wait for an admin or circle lead. Otherwise bookings confirm instantly.</span>
        </label>

        {error && <div style={{ fontSize: 13, color: '#dc2626', background: 'color-mix(in srgb, #dc2626 8%, var(--surface))', borderRadius: 8, padding: '8px 10px' }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onClose} style={{ fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink-2)', cursor: 'pointer' }}>
            Cancel
          </button>
          <button type="submit" disabled={saving} style={{ fontSize: 13, fontWeight: 600, padding: '8px 18px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--bk-accent)', color: '#fff', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : existing ? 'Save changes' : 'Add item'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}
