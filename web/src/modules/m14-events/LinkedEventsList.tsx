'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { CalendarEvent } from './types'
import { fmtEventWhen, isPast } from './lib/calendar'
import { eventColor } from './CalendarViews'

/** Upcoming events linked to a project (or proposal), for other modules' pages. */
export function LinkedEventsList({ events, addHref }: {
  events: CalendarEvent[]
  /** "+ Add event" target, or null when the viewer can't post. */
  addHref: string | null
}) {
  // Times are formatted in the viewer's zone, so wait for mount
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => setNow(new Date()), [])
  const upcoming = now ? events.filter(e => !isPast(e, now)) : []

  if (!addHref && events.length === 0) return null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)' }}>
          Events
        </div>
        {addHref && (
          <Link href={addHref} style={{ fontSize: 12, fontWeight: 600, color: 'var(--m14)', textDecoration: 'none' }}>+ Add event</Link>
        )}
      </div>
      {now && upcoming.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>No upcoming events.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {upcoming.map(e => (
            <Link
              key={e.id}
              href={`/events?event=${e.id}`}
              style={{
                display: 'block', textDecoration: 'none', background: 'var(--surface)',
                border: '1px solid var(--rule)', borderLeft: `3px solid ${eventColor(e)}`, borderRadius: 8, padding: '10px 12px',
              }}
            >
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)', overflowWrap: 'anywhere' }}>{e.title}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                {fmtEventWhen(e)}{e.location ? ` · ${e.location}` : ''}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
