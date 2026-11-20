'use client'

import { useState } from 'react'
import { useCircles } from '@/core/components/CirclesProvider'
import { Button, Icon } from '@/core/components/v4'
import type { CalendarEvent, EventRsvp, RsvpStatus } from './types'
import { KIND_META } from './lib/permissions'
import { dayKey, eventDayKeys, fmtMonthTitle, fmtTime, isPast, monthGrid, sameDay, startOfDay } from './lib/calendar'
import { eventColor } from './CalendarViews'

const PAGE = 12

/**
 * The calendar's List view in the v4 look (Sonia's prototype, pCalendar): a date box per event, its time, place,
 * circle and who's going, a one-tap RSVP, and a small month beside it with dots on the days that have something.
 * Picking a day opens the Day view; the event itself opens its pop-up as before.
 */
export function AgendaV4({ events, rsvps, userId, now, showPast, onOpen, onRsvp, onPickDay }: {
  events: CalendarEvent[]; rsvps: EventRsvp[]; userId: string | null; now: Date; showPast: boolean
  onOpen: (id: string) => void; onRsvp: (id: string, status: RsvpStatus | null) => void; onPickDay: (d: Date) => void
}) {
  const circles = useCircles()
  const [all, setAll] = useState(false)
  const [month, setMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1))
  const list = events
    .filter(e => showPast ? isPast(e, now) : !isPast(e, now))
    .sort((a, b) => (showPast ? -1 : 1) * (new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()))
  const shown = all ? list : list.slice(0, PAGE)
  const evDays = new Set(events.flatMap(eventDayKeys))
  const grid = monthGrid(month)

  return (
    <div className="ag4">
      <div>
        {shown.length === 0 ? (
          <div className="v4-empty"><span className="v4-empty__art"><Icon name="calendar" size={30} /></span><b>{showPast ? 'No past events here yet' : 'Nothing coming up here yet'}</b></div>
        ) : (
          <div className="v4-list">
            {shown.map(e => {
              const d = new Date(e.starts_at)
              const going = rsvps.filter(r => r.event_id === e.id && r.status === 'going').length
              const mine = userId ? rsvps.find(r => r.event_id === e.id && r.user_id === userId)?.status ?? null : null
              const meta = KIND_META[e.kind]
              const task = e.kind === 'task'
              const facts = [
                d.toLocaleDateString('en-GB', { weekday: 'short' }),
                e.all_day ? 'All day' : fmtTime(e.starts_at),
                e.location || (e.online_url ? 'Online' : null),
                !task && going ? `${going} ${meta.goingCount}` : null,
              ].filter(Boolean).join(' · ')
              return (
                <div key={e.id} className="v4-row ag4-row" style={{ ['--ev' as string]: eventColor(e) }}>
                  <button type="button" className="ag4-open no-min-height" onClick={() => onOpen(e.id)}>
                    <span className={`ag4-date${sameDay(d, now) ? ' ag4-date--today' : ''}`}><small>{d.toLocaleDateString('en-GB', { month: 'short' })}</small><b>{d.getDate()}</b></span>
                    <span className="v4-row__main">
                      <b>{e.title}</b>
                      <small>{facts}</small>
                      <small className="ag4-sub">
                        <span className="v4-dot" style={{ background: circles.has(e.circle) ? circles.meta(e.circle).color : meta.color, width: 7, height: 7 }} />
                        {circles.has(e.circle) ? circles.meta(e.circle).label : meta.label}
                        {e.project ? ` · ${e.project.title}` : ''}{e.is_public ? ' · Public' : ''}
                      </small>
                    </span>
                  </button>
                  {userId && !task && !showPast && (
                    <span className="v4-row__trail">
                      {mine === 'going'
                        ? <Button size="sm" variant="secondary" icon="check" onClick={() => onRsvp(e.id, null)} aria-label={`${meta.youGoing.replace('✓ ', '')}. Tap to undo`}>{meta.goingLabel}</Button>
                        : <Button size="sm" onClick={() => onRsvp(e.id, 'going')}>{mine === 'maybe' ? 'Maybe · RSVP' : 'RSVP'}</Button>}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
        {!all && list.length > PAGE && (
          <p className="ag4-more"><Button variant="quiet" onClick={() => setAll(true)}>See all {list.length} events →</Button></p>
        )}
      </div>

      <div className="v4-card ag4-month">
        <div className="v4-sec ag4-mhead">
          <h2>{fmtMonthTitle(month)}</h2>
          <span className="v4-seg">
            <button type="button" className="no-min-height" aria-label="Previous month" onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}><Icon name="left" size={14} /></button>
            <button type="button" className="no-min-height" aria-label="Next month" onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}><Icon name="right" size={14} /></button>
          </span>
        </div>
        <div className="ag4-grid">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i} className="ag4-dow">{d}</span>)}
          {grid.map(d => {
            const out = d.getMonth() !== month.getMonth()
            const ev = evDays.has(dayKey(d))
            return (
              <button key={dayKey(d)} type="button" className={`ag4-d no-min-height${out ? ' out' : ''}${sameDay(d, now) ? ' today' : ''}${ev ? ' ev' : ''}`}
                onClick={() => onPickDay(startOfDay(d))} aria-label={`${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}${ev ? ', has events' : ''}`}>
                {d.getDate()}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
