/**
 * The Blueprint's Circles setup step (INSTANCES.md §6.2): circles found by the AI
 * scan, the two starting templates, and the slugs / emoji / colours given to new
 * circles. Found circles wait in the Blueprint answers under FOUND_CIRCLES_KEY
 * until an admin confirms them; only confirmed circles go into the `circles` table.
 */

export const FOUND_CIRCLES_KEY = '_circles_found'

export interface FoundCircle {
  name: string
  purpose: string
  lead_names: string[]
  /** Short quote from the document it came from. */
  source: string
}

/** Added to the scan prompt (full-document scans and the Circles step's own scan). */
export const CIRCLES_PROMPT_RULE = `- Also include a "circles" array: the community's circles, meaning standing groups, teams, departments, guilds or circles that each look after an area of responsibility. Each item: {"name": "…", "purpose": "one sentence on what this circle takes care of", "lead_names": ["…"], "source": "short quote from the document it came from"}. Do NOT count one-off projects, committees for a single event, or lists of values or pillars. Every circle must carry a "source" quote copied from the document; leave out any you can't quote. If the document describes none, omit the key.`

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

/** Clean up the scan's circles from every chunk: drop any without a source quote, merge duplicates by name. */
export function mergeFoundCircles(lists: unknown[]): FoundCircle[] {
  const byName = new Map<string, FoundCircle>()
  for (const list of lists) {
    if (!Array.isArray(list)) continue
    for (const raw of list) {
      if (!raw || typeof raw !== 'object') continue
      const r = raw as Record<string, unknown>
      const name = str(r.name).slice(0, 60)
      const source = str(r.source)
      if (!name || !source) continue
      const leads = Array.isArray(r.lead_names) ? r.lead_names.map(str).filter(Boolean) : []
      const key = name.toLowerCase()
      const prev = byName.get(key)
      if (!prev) { byName.set(key, { name, purpose: str(r.purpose), lead_names: leads, source }); continue }
      if (str(r.purpose).length > prev.purpose.length) prev.purpose = str(r.purpose)
      prev.lead_names = [...new Set([...prev.lead_names, ...leads])]
    }
  }
  return [...byName.values()]
}

export function foundCircles(values: Record<string, unknown>): FoundCircle[] {
  return mergeFoundCircles([values[FOUND_CIRCLES_KEY]])
}

// The first template is the default, from the neighborhood org chart ("Neighborhoods Org Charts.pdf")
export const CIRCLE_TEMPLATES: { id: string; label: string; circles: { name: string; purpose: string; emoji?: string }[] }[] = [
  {
    id: 'neighborhood', label: 'Neighborhood org chart',
    circles: [
      { name: 'Community Management', emoji: '🤝', purpose: 'Volunteers, leaders, welcoming new members and holding community circles' },
      { name: 'Venue Management',     emoji: '🏡', purpose: 'Hospitality, preparing rooms, rental requests and events' },
      { name: 'Space Maintenance',    emoji: '🔧', purpose: 'Cleaning, property repairs, and wifi and connectivity' },
      { name: 'Kitchen Management',   emoji: '🍳', purpose: 'Food lists, the weekly meal plan and the cooking rota' },
      { name: 'Marketing & Outreach', emoji: '📣', purpose: 'Content strategy, social media and promoting events' },
      { name: 'Sustainable Systems',  emoji: '🌱', purpose: 'Energy, water, waste management and permaculture' },
      { name: 'Operations',           emoji: '📋', purpose: 'Project management, team dynamics and finance' },
      { name: 'Strategy',             emoji: '🧭', purpose: 'Vision, mission, values and timeline' },
    ],
  },
  {
    id: 'regen-five', label: 'Regen five',
    circles: [
      { name: 'Ecology',   purpose: 'Land, water, soil, food and biodiversity' },
      { name: 'Hardware',  purpose: 'Buildings, energy, water systems and infrastructure' },
      { name: 'Humanware', purpose: 'Relationships, culture, care and belonging' },
      { name: 'Economy',   purpose: 'Money, value flows, contributions and livelihoods' },
      { name: 'Tech',      purpose: 'Digital tools, data and connectivity' },
    ],
  },
  {
    id: 'start-small', label: 'Start small',
    circles: [
      { name: 'Land & Food',      purpose: 'Growing food and caring for the land' },
      { name: 'Building',         purpose: 'Construction, maintenance and infrastructure' },
      { name: 'Community & Care', purpose: 'Belonging, wellbeing and looking after each other' },
      { name: 'Finance',          purpose: "Budgets, funding and the community's money" },
    ],
  },
]

export const CIRCLE_COLORS = [
  '#15803d', '#b45309', '#be185d', '#0369a1', '#7c3aed',
  '#0f766e', '#c2410c', '#4d7c0f', '#a21caf', '#1d4ed8', '#9f1239', '#57534e',
]

export const CIRCLE_EMOJIS = ['🌱', '🌾', '💧', '🔧', '🏡', '🤝', '💚', '💱', '⚙️', '📚', '🎨', '🧭', '⚡', '🎪', '🍳', '📣', '📋', '◯']

// First match wins, so the more specific words come first
const EMOJI_HINTS: [RegExp, string][] = [
  [/kitchen|cook|meal/, '🍳'],
  [/food|farm|garden|agri/, '🌾'],
  [/water/, '💧'],
  [/ecolog|land|nature|forest|soil/, '🌱'],
  [/hous|home/, '🏡'],
  [/build|hardware|infra|construct|mainten/, '🔧'],
  [/energy|power|solar/, '⚡'],
  [/care|well|health|heal/, '💚'],
  [/communit|social|human|people|cultur|belong/, '🤝'],
  [/financ|econom|money|fund|treasur/, '💱'],
  [/tech|digital|data|software/, '⚙️'],
  [/learn|educat|school|kids|youth/, '📚'],
  [/art|creative|music/, '🎨'],
  [/govern|decision|legal/, '🧭'],
  [/event|hospital|guest/, '🎪'],
  [/market|outreach|media|comms/, '📣'],
  [/operation|project/, '📋'],
]

export function emojiFor(name: string): string {
  const n = name.toLowerCase()
  return EMOJI_HINTS.find(([re]) => re.test(n))?.[1] ?? '◯'
}

/** "Land & Food" → "land-food"; adds -2, -3… if the slug is taken (retired circles included). */
export function slugFor(name: string, taken: Set<string>): string {
  const base = name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 36).replace(/-+$/, '') || 'circle'
  let slug = base
  for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`
  return slug
}
