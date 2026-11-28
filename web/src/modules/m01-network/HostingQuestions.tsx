'use client'
import Link from 'next/link'
import { Icon } from '@/core/components/v4'
import { pastel } from '@/core/lib/skills-interests'
import { DAILY_WORK, DIETS, QUESTIONS, dietWords, toggleDiet, type HostingAnswers, type Idea } from '@/core/lib/hosting-questions'
import './hosting-questions.css'

/**
 * The questions a community that hosts people asks ("hostingQuestions"): Edit profile's "You and <community>"
 * tab, and later the stay request, which reads and fills the same answers (core/lib/hosting-questions.ts).
 * Phone first (Sonia, 28 Nov: "mobile optimized, not overwhelming"): three short groups, one open at a time,
 * each closed group saying its answer in one line, so the whole tab fits a phone screen.
 */

export type HostingGroup = 'coming' | 'food' | 'ideas'
/** Which group a "Still to add" field sits in, so the link can open it */
export const HOSTING_FIELD_GROUP: Record<string, HostingGroup> = {
  'pe-brings': 'coming', 'pe-work': 'coming', 'pe-food': 'food', 'pe-experience': 'ideas',
}

const cut = (t: string, n = 44) => { const s = t.replace(/\s+/g, ' ').trim(); return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s }
const isNone = (t: string) => /^(none|no|nope|n\/a|-)\.?$/i.test(t.trim())

function summary(g: HostingGroup, a: HostingAnswers): string {
  const bits: string[] = []
  if (g === 'coming') {
    // The short answer first, so a long one doesn't hide it
    const w = DAILY_WORK.find(d => d.id === a.daily_work)
    if (w) bits.push(a.daily_work === 'no' ? 'No daily work' : w.label.replace('Yes, ', '').replace(/^./, c => c.toUpperCase()) + ' work')
    if (a.what_brings_you.trim()) bits.push(cut(a.what_brings_you, 36))
  } else if (g === 'food') {
    if (a.diet.length) bits.push(dietWords(a))
    if (a.allergies.trim()) bits.push(isNone(a.allergies) ? 'No allergies' : `Allergies: ${cut(a.allergies, 28)}`)
  } else {
    const n = a.ideas.filter(i => i.title.trim()).length
    if (n) bits.push(n === 1 ? '1 idea' : `${n} ideas`)
    if (a.exchange_experience.trim()) bits.push(cut(a.exchange_experience, 36))
  }
  return bits.join(' · ')
}

interface Props {
  value: HostingAnswers
  onChange: (v: HostingAnswers) => void
  open: HostingGroup | null
  onOpen: (g: HostingGroup | null) => void
  /** Suggests one idea as a task. Left out when the person may not suggest tasks yet (before joining) */
  onSuggest?: (idea: Idea) => void
  /** The id of the idea being suggested right now */
  suggesting?: string | null
}

export function HostingQuestions({ value: a, onChange, open, onOpen, onSuggest, suggesting }: Props) {
  const set = <K extends keyof HostingAnswers>(k: K, v: HostingAnswers[K]) => onChange({ ...a, [k]: v })
  const setIdea = (id: string, title: string) => set('ideas', a.ideas.map(i => (i.id === id ? { ...i, title } : i)))
  const hasIdeas = a.ideas.some(i => i.title.trim() && !i.project_id)

  const group = (g: HostingGroup, n: number, name: string, body: React.ReactNode) => {
    const isOpen = open === g
    const sum = summary(g, a)
    return (
      <section className="hq-group" style={pastel(n) as React.CSSProperties} data-open={isOpen}>
        <button type="button" className="hq-head" aria-expanded={isOpen} aria-controls={`hq-${g}`} onClick={() => onOpen(isOpen ? null : g)}>
          <span className="hq-head__text">
            <b>{name}</b>
            {!isOpen && <small data-empty={!sum}>{sum || 'Not answered yet'}</small>}
          </span>
          <Icon name="down" size={20} className="hq-chev" />
        </button>
        {isOpen && <div className="hq-body" id={`hq-${g}`}>{body}</div>}
      </section>
    )
  }

  return (
    <div className="hq">
      <p className="hq-note"><Icon name="lock" size={14} />Private: only you, the admins and whoever hosts guests. The kitchen sees diet and allergies.</p>

      {group('coming', 0, 'Coming here', (
        <>
          <div className="hq-q">
            <label htmlFor="pe-brings">{QUESTIONS.brings}</label>
            <textarea id="pe-brings" className="hq-field" rows={3} maxLength={2000} value={a.what_brings_you}
              onChange={e => set('what_brings_you', e.target.value)} placeholder="A sentence or two" />
          </div>
          <div className="hq-q" id="pe-work" role="group" aria-labelledby="hq-work-l">
            <span className="hq-label" id="hq-work-l">{QUESTIONS.work}</span>
            <small>{QUESTIONS.workHint}</small>
            <div className="hq-pills">
              {DAILY_WORK.map(d => (
                <button key={d.id} type="button" className="hq-pill" aria-pressed={a.daily_work === d.id}
                  onClick={() => set('daily_work', a.daily_work === d.id ? '' : d.id)}>
                  {a.daily_work === d.id && <Icon name="check" size={16} />}{d.label}
                </button>
              ))}
            </div>
          </div>
        </>
      ))}

      {group('food', 1, 'Food', (
        <div id="pe-food" className="hq-stack">
          <div className="hq-q" role="group" aria-labelledby="hq-diet-l">
            <span className="hq-label" id="hq-diet-l">{QUESTIONS.diet}</span>
            <div className="hq-pills">
              {DIETS.map(d => (
                <button key={d.id} type="button" className="hq-pill" aria-pressed={a.diet.includes(d.id)}
                  onClick={() => set('diet', toggleDiet(a.diet, d.id))}>
                  {a.diet.includes(d.id) && <Icon name="check" size={16} />}{d.label}
                </button>
              ))}
            </div>
            {a.diet.includes('other') && (
              <input className="hq-field" value={a.diet_other} maxLength={200} onChange={e => set('diet_other', e.target.value)}
                placeholder="What do you eat, or not?" aria-label="Your diet, in your own words" />
            )}
          </div>
          <div className="hq-q">
            <label htmlFor="hq-allergies">{QUESTIONS.allergies}</label>
            <div className="hq-row">
              <input id="hq-allergies" className="hq-field" value={a.allergies} maxLength={500}
                onChange={e => set('allergies', e.target.value)} placeholder="What they are" />
              <button type="button" className="hq-pill" aria-pressed={isNone(a.allergies)} onClick={() => set('allergies', isNone(a.allergies) ? '' : 'None')}>
                {isNone(a.allergies) && <Icon name="check" size={16} />}None
              </button>
            </div>
          </div>
        </div>
      ))}

      {group('ideas', 2, 'Experience and ideas', (
        <>
          <div className="hq-q">
            <label htmlFor="pe-experience">{QUESTIONS.experience}</label>
            <textarea id="pe-experience" className="hq-field" rows={3} maxLength={2000} value={a.exchange_experience}
              onChange={e => set('exchange_experience', e.target.value)} placeholder="Where, and for how long" />
          </div>
          <div className="hq-q" id="pe-ideas" role="group" aria-labelledby="hq-ideas-l">
            <span className="hq-label" id="hq-ideas-l">{QUESTIONS.ideas}</span>
            <small>Each one can become a task idea on the board.</small>
            {a.ideas.map((idea, n) => (
              <div key={idea.id} className="hq-idea">
                <div className="hq-row">
                  <input className="hq-field" value={idea.title} maxLength={120} onChange={e => setIdea(idea.id, e.target.value)}
                    placeholder="e.g. A mushroom lab" aria-label={`Idea ${n + 1}`} />
                  <button type="button" className="hq-x" aria-label={`Remove idea ${n + 1}`} onClick={() => set('ideas', a.ideas.filter(i => i.id !== idea.id))}>
                    <Icon name="x" size={18} />
                  </button>
                </div>
                {idea.project_id
                  ? <Link className="hq-onboard" href={`/operations/${idea.project_id}`}><Icon name="board" size={14} />On the board, in Ideas</Link>
                  : onSuggest && idea.title.trim() && (
                    <button type="button" className="hq-link" disabled={!!suggesting} onClick={() => onSuggest(idea)}>
                      {suggesting === idea.id ? 'Suggesting…' : 'Suggest as a task'}
                    </button>
                  )}
              </div>
            ))}
            {a.ideas.length < 20 && (
              <button type="button" className="hq-add" onClick={() => set('ideas', [...a.ideas, { id: crypto.randomUUID(), title: '' }])}>
                <Icon name="plus" size={16} />Add idea
              </button>
            )}
            {!onSuggest && hasIdeas && (
              <p className="hq-lock">Suggest them as tasks once you’ve joined · <Link href="/join">Start joining</Link></p>
            )}
          </div>
        </>
      ))}
    </div>
  )
}

/** "Keep me posted": news and events by email. On Edit profile's Links tab; a stay request offers it too. */
export function KeepPosted({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="v4-check hq-posted" id="pe-posted">
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} />
      <span><b>{QUESTIONS.keepPosted}</b><br />{QUESTIONS.keepPostedHint}</span>
    </label>
  )
}
