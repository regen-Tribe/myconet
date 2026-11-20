import type { SupabaseClient } from '@supabase/supabase-js'
import { Button, Card, Icon, Tag, type IconName } from '@/core/components/v4'
import { loadBranding } from '@/core/lib/branding-server'
import { roleAtLeast } from '@/core/lib/roles'
import { FW_DATA } from './lib/wizard-data'
import { glanceText } from '@/modules/home/lib/at-a-glance'

/**
 * About {community} in the v4 look (Sonia's prototype, 19 Nov): the Blueprint told as a page people
 * read, not a planning form. Everything comes from the community's Blueprint answers, so the page
 * changes when the Blueprint does. Chapters pick the answers a newcomer wants first; every other
 * answered field is still shown under "The whole Blueprint", so nothing the wizard holds is hidden.
 * Editing stays in the wizard (`/about?edit=1`, or any `?step=` link).
 */

type Chapter = { id: string; title: string; icon: IconName; tone: Tone; fields: [string, string][]; link?: { href: string; label: string } }
type Tone = 'blue' | 'red' | 'yellow' | 'green' | 'violet'

// Reader-friendly headings for the wizard's fields (LEXICON.md words). Order is the reading order.
const CHAPTERS: Chapter[] = [
  { id: 'why', title: 'Why we’re here', icon: 'sprout', tone: 'green', fields: [
    ['purpose', 'Our purpose'], ['why_world', 'What we answer'], ['why_personal', 'Why it matters to us'], ['dream_origin', 'How it started'], ['why_now', 'Why now, why here'],
  ] },
  { id: 'mission', title: 'Mission and vision', icon: 'spark', tone: 'yellow', fields: [
    ['mission_statement', 'Our mission'], ['vision_statement', 'Our vision'],
  ] },
  { id: 'values', title: 'What we value', icon: 'heart', tone: 'red', fields: [
    ['values', 'Our values'], ['community_agreements', 'Our agreements'],
  ] },
  { id: 'land', title: 'The land', icon: 'pin', tone: 'green', fields: [
    ['location_setting', 'The place'], ['ecological_philosophy', 'Living with nature'], ['eco_assessment', 'What the land is like'],
    ['cultural_land_context', 'The people of this place'], ['climate_emergencies', 'Weather and risks'],
  ] },
  { id: 'live', title: 'How we live', icon: 'home', tone: 'blue', link: { href: '/calendar', label: 'Open Calendar →' }, fields: [
    ['daily_rhythms', 'Days and weeks'], ['rituals', 'Rituals'], ['gatherings_internal', 'Gatherings'], ['shared_lifestyle_stance', 'Living together'],
    ['food_systems', 'Food'], ['water_fresh', 'Water'], ['energy_source', 'Energy'], ['amenities', 'Shared spaces'], ['personal_regen_practices', 'Looking after ourselves'],
  ] },
  { id: 'decide', title: 'How we decide', icon: 'scale', tone: 'violet', link: { href: '/governance', label: 'Open Governance →' }, fields: [
    ['governance_model', 'How we govern'], ['decision_method', 'How decisions are made'], ['conflict_process', 'When we disagree'], ['scope', 'What we decide together'],
  ] },
  { id: 'share', title: 'How we share', icon: 'handshake', tone: 'yellow', fields: [
    ['economic_philosophy', 'What we believe about money'], ['commons', 'What we share'], ['business_models', 'How we sustain ourselves'],
    ['resident_finances', 'What living here costs'], ['real_estate_model', 'How people buy in'], ['legal_structure', 'Who owns it'],
  ] },
  { id: 'join', title: 'Joining us', icon: 'users', tone: 'red', link: { href: '/join', label: 'Open Join →' }, fields: [
    ['ideal_archetypes', 'Who we’re looking for'], ['value_exchange', 'What you give and get'], ['onboarding', 'How joining works'], ['screening', 'How we get to know you'],
  ] },
  { id: 'next', title: 'Where we’re going', icon: 'flag', tone: 'blue', fields: [
    ['where_now', 'Where we are now'], ['goals_3yr', 'The next three years'], ['goals_5_10yr', 'Five and ten years'], ['next_horizon', 'What we want to become'], ['build_timeline', 'Building, step by step'],
  ] },
]

// Short facts shown as tiles under the hero
const FACTS: [string, string][] = [
  ['project_country', 'Country'], ['land_size', 'Land'], ['community_size', 'People'], ['planned_homes', 'Homes'], ['climate', 'Climate'], ['community_type', 'Kind of community'],
]

const HERO_LEAD = ['purpose', 'mission_statement', 'vision_statement']

/** The Blueprint's working name is often a sentence ("Protopia — a regenerative farm…"): the part after the name is a tagline. */
function splitName(projectName: string | null, fallback: string) {
  if (!projectName) return { name: fallback, tagline: null }
  const m = projectName.match(/^(.{2,40}?)\s+[—–-]\s+([\s\S]+)$/)
  if (m) return { name: m[1].replace(/\s+Community$/i, '').trim(), tagline: m[2].trim().replace(/^\p{Ll}/u, c => c.toUpperCase()) }
  return projectName.length <= 40 ? { name: projectName, tagline: null } : { name: fallback, tagline: projectName }
}

const str = (v: unknown) => (typeof v === 'string' && v.trim().length > 1 ? v.trim() : null)

export default async function AboutV4({ supabase, communityName, role, canEdit }: {
  supabase: SupabaseClient; communityName: string; role: string; canEdit: boolean
}) {
  const [{ data: bp }, branding, { data: values }] = await Promise.all([
    supabase.from('blueprints').select('answers').eq('is_community', true).maybeSingle(),
    loadBranding(supabase),
    supabase.from('community_values').select('id, title, description').order('sort_order'),
  ])
  const a = ((bp?.answers as Record<string, unknown> | null) ?? {})
  const { name, tagline } = splitName(str(a.project_name), communityName)
  const leadKey = HERO_LEAD.find(k => str(a[k]))
  const lead = leadKey ? glanceText(a[leadKey], 280) : null
  const facts = FACTS.map(([k, label]) => [label, glanceText(a[k], 110)] as const).filter(([, v]) => v)
  const chapters = CHAPTERS
    .map(c => ({ ...c, items: c.fields.map(([k, h]) => [h, str(a[k])] as const).filter(([, v]) => v) as [string, string][] }))
    .filter(c => c.items.length > 0 || (c.id === 'values' && (values?.length ?? 0) > 0))

  // Every other answered field, by phase and step, so nothing the Blueprint holds is lost here
  const shown = new Set([...CHAPTERS.flatMap(c => c.fields.map(([k]) => k)), ...FACTS.map(([k]) => k), 'project_name'])
  const rest = FW_DATA.phases.map(p => ({
    phase: p,
    steps: p.steps.map(s => ({ step: s, items: (s.fields ?? []).filter(f => !shown.has(f.id) && str(a[f.id])).map(f => [f.label, str(a[f.id])!] as const) }))
      .filter(s => s.items.length > 0),
  })).filter(p => p.steps.length > 0)

  const isJoining = roleAtLeast(role, 'joining')
  const empty = !lead && chapters.length === 0 && rest.length === 0

  return (
    <div className="v4-page v4-about">
      <header className="v4-about-hero" style={branding.banner_url ? { backgroundImage: `url(${branding.banner_url})` } : undefined}>
        <div className="v4-about-hero__card">
          {branding.logo_url && <img src={branding.logo_url} alt="" className="v4-about-hero__logo" />}
          <div className="v4-eyebrow">About</div>
          <h1 className="v4-ph__title">{name}</h1>
          {tagline && <p className="v4-about-hero__tag">{tagline}</p>}
          {lead && <p className="v4-about-hero__lead">{lead}</p>}
          <div className="v4-ph__actions">
            {!isJoining && <Button variant="next" href="/join">Start joining</Button>}
            <Button variant="secondary" href="/members" icon="users">Meet the members</Button>
            {canEdit && <Button variant="secondary" href="/about?edit=1" icon="pencil">Edit the Blueprint</Button>}
          </div>
        </div>
      </header>

      {facts.length > 0 && (
        <div className="v4-facts">
          {facts.map(([label, v]) => <div key={label} className="v4-fact"><small>{label}</small><b>{v}</b></div>)}
        </div>
      )}

      {empty && (
        <Card className="v4-mt">
          <b>The Blueprint is still empty.</b>
          <p className="v4-prose">{canEdit ? 'Fill in the Blueprint and this page tells your story.' : 'Check back soon: the circle leads are writing it.'}</p>
          {canEdit && <Button href="/about?edit=1" icon="pencil">Edit the Blueprint</Button>}
        </Card>
      )}

      {chapters.length > 1 && (
        <nav className="v4-chiprow v4-about-toc" aria-label="Chapters">
          {chapters.map(c => <a key={c.id} href={`#${c.id}`} className="v4-chip">{c.title}</a>)}
          {rest.length > 0 && <a href="#blueprint" className="v4-chip">The whole Blueprint</a>}
        </nav>
      )}

      {chapters.map(c => (
        <section key={c.id} id={c.id} className="v4-chapter">
          <div className="v4-chapter__head">
            <span className={`v4-tile v4-tile--${c.tone}`}><Icon name={c.icon} /></span>
            <h2>{c.title}</h2>
            {c.link && <a href={c.link.href} className="v4-chapter__link">{c.link.label}</a>}
          </div>
          <div className="v4-chapter__body">
            {c.id === 'values' && (values?.length ?? 0) > 0 && (
              <div className="v4-values">
                {values!.map(v => (
                  <Card key={v.id}><b>{v.title}</b>{v.description && <p className="v4-prose">{v.description}</p>}</Card>
                ))}
              </div>
            )}
            {c.items.map(([h, text]) => (
              <div key={h} className="v4-answer">
                <h3>{h}</h3>
                <p className="v4-prose">{text}</p>
              </div>
            ))}
          </div>
        </section>
      ))}

      {rest.length > 0 && (
        <section id="blueprint" className="v4-chapter">
          <div className="v4-chapter__head">
            <span className="v4-tile v4-tile--grey"><Icon name="book" /></span>
            <h2>The whole Blueprint</h2>
          </div>
          <div className="v4-chapter__body">
            <p className="v4-prose v4-muted">Everything else in our plan, phase by phase.</p>
            {rest.map(({ phase, steps }) => (
              <details key={phase.id} className="v4-fold">
                <summary><Tag>{phase.name}</Tag> {phase.subtitle}</summary>
                {steps.map(({ step, items }) => (
                  <div key={step.id} className="v4-fold__step">
                    <h3>{step.title}</h3>
                    {items.map(([label, text]) => (
                      <div key={label} className="v4-answer"><h4>{label}</h4><p className="v4-prose">{text}</p></div>
                    ))}
                  </div>
                ))}
              </details>
            ))}
          </div>
        </section>
      )}

      <p className="v4-more">
        <a className="v4-btn v4-btn--quiet" href="/about?edit=1">{canEdit ? 'Edit the Blueprint' : 'See the Blueprint as a plan: phases, steps and readiness'} →</a>
      </p>
    </div>
  )
}
