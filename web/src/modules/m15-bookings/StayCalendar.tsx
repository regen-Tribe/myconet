'use client'

/**
 * Pick the nights of a stay on a calendar that shows which nights are free: tap the day you arrive, then
 * the day you leave. Taken nights are crossed out and can't be chosen; nobody's name is shown here.
 * You can leave on the day someone else arrives, as the database allows ([) ranges).
 */

import { useMemo, useState } from 'react'
import { Icon } from '@/core/components/v4'
import { localDateInput } from './lib/inventory'
import './stay-calendar.css'

export interface TakenStay { starts_at: string; ends_at: string; mine?: boolean }

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const dateOf = (key: string) => new Date(`${key}T00:00`)
const longDay = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

/** Every night each stay holds, as local "YYYY-MM-DD" keys (the date of the evening). */
function takenNights(stays: TakenStay[], from: Date): { taken: Set<string>; mine: Set<string> } {
  const taken = new Set<string>(), mine = new Set<string>()
  for (const s of stays) {
    const end = new Date(s.ends_at)
    const d = new Date(s.starts_at)
    d.setHours(0, 0, 0, 0)
    if (d < from) d.setTime(from.getTime())
    // A stay of several years is still a few thousand keys at most
    for (let i = 0; d < end && i < 3660; i++) {
      const key = localDateInput(d)
      taken.add(key)
      if (s.mine) mine.add(key)
      d.setDate(d.getDate() + 1)
    }
  }
  return { taken, mine }
}

export function StayCalendar({ stays, today, checkIn, checkOut, onChange }: {
  /** The stays holding this place (waiting or confirmed) */
  stays: TakenStay[]
  today: Date
  /** "YYYY-MM-DD" or '' */
  checkIn: string
  checkOut: string
  onChange: (checkIn: string, checkOut: string) => void
}) {
  const todayKey = localDateInput(today)
  const start = useMemo(() => dateOf(todayKey), [todayKey])
  const { taken, mine } = useMemo(() => takenNights(stays, start), [stays, start])
  // The first month shown; opens on the chosen arrival, else this month
  const [offset, setOffset] = useState(() => {
    if (!checkIn) return 0
    const d = dateOf(checkIn)
    return Math.max(0, (d.getFullYear() - start.getFullYear()) * 12 + d.getMonth() - start.getMonth())
  })

  const choosingOut = !!checkIn && !checkOut
  // With an arrival chosen, the last day you can leave: the day the next stay starts
  const lastOut = useMemo(() => {
    if (!choosingOut) return null
    const d = dateOf(checkIn)
    for (let i = 0; i < 3660; i++) {
      if (taken.has(localDateInput(d))) return localDateInput(d)
      d.setDate(d.getDate() + 1)
    }
    return null
  }, [choosingOut, checkIn, taken])

  function pick(key: string) {
    if (choosingOut && key > checkIn && (!lastOut || key <= lastOut)) return onChange(checkIn, key)
    if (!taken.has(key)) onChange(key, '')
  }

  const month = (n: number) => {
    const first = new Date(start.getFullYear(), start.getMonth() + offset + n, 1)
    const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
    const lead = (first.getDay() + 6) % 7 // Monday first
    return (
      <div className={`stay-cal__month${n ? ' stay-cal__month--second' : ''}`} key={n}>
        <div className="stay-cal__title">{first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
        <div className="stay-cal__grid" role="grid" aria-label={first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}>
          {WEEKDAYS.map(w => <span key={w} className="stay-cal__wd" aria-hidden="true">{w}</span>)}
          {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />)}
          {Array.from({ length: days }, (_, i) => {
            const d = new Date(first.getFullYear(), first.getMonth(), i + 1)
            const key = localDateInput(d)
            const past = key < todayKey
            const isTaken = taken.has(key)
            const canLeave = choosingOut && key > checkIn && (!lastOut || key <= lastOut)
            // While choosing the day you leave, days past the next stay can't be reached
            const blocked = past || (isTaken && !canLeave) || (choosingOut && !!lastOut && key > lastOut)
            const isIn = key === checkIn, isOut = key === checkOut
            const between = !!checkIn && !!checkOut && key > checkIn && key < checkOut
            const cls = ['stay-cal__day']
            if (past) cls.push('is-past')
            else if (isTaken && !canLeave) cls.push(mine.has(key) ? 'is-mine' : 'is-taken')
            else if (blocked) cls.push('is-out')
            if (isIn || isOut) cls.push('is-end')
            if (between) cls.push('is-between')
            if (key === todayKey) cls.push('is-today')
            const state = isIn ? 'check-in' : isOut ? 'check-out' : past ? 'past' : isTaken && !canLeave ? (mine.has(key) ? 'your stay' : 'taken') : blocked ? 'not available' : 'free'
            return (
              <button key={key} type="button" className={cls.join(' ')} disabled={blocked && !isIn && !isOut}
                aria-label={`${longDay(d)}, ${state}`} aria-pressed={isIn || isOut} onClick={() => pick(key)}>
                {i + 1}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="stay-cal">
      <div className="stay-cal__nav">
        <button type="button" className="stay-cal__arrow" aria-label="Earlier months" disabled={offset === 0} onClick={() => setOffset(o => Math.max(0, o - 1))}><Icon name="left" size={18} /></button>
        <span className="stay-cal__prompt" aria-live="polite">
          {!checkIn ? 'Tap your check-in day' : !checkOut ? 'Now tap your check-out day' : 'Tap a day to change your dates'}
        </span>
        <button type="button" className="stay-cal__arrow" aria-label="Later months" onClick={() => setOffset(o => o + 1)}><Icon name="right" size={18} /></button>
      </div>
      <div className="stay-cal__months">{month(0)}{month(1)}</div>
      <div className="stay-cal__legend">
        <span><i className="stay-cal__key" />Free</span>
        <span><i className="stay-cal__key stay-cal__key--taken" />Taken</span>
        {mine.size > 0 && <span><i className="stay-cal__key stay-cal__key--mine" />Your stay</span>}
        {checkIn && <button type="button" className="stay-cal__clear" onClick={() => onChange('', '')}>Clear dates</button>}
      </div>
    </div>
  )
}
