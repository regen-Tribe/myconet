import type { SupabaseClient } from '@supabase/supabase-js'
import { COMMUNITY_NAME } from './instance'

/**
 * The questions a community that hosts people asks ("hostingQuestions": true; core/lib/instance.ts ›
 * HOSTING_QUESTIONS). Edit profile asks them, and a stay request reads and fills the same answers, so each
 * is kept once per person (migration 20270103000000_profile_questions.sql):
 *
 *   user_intake  what brings you, daily work, experience, ideas, keep me posted
 *                read by the person, admins and the leads of a circle that hosts
 *   user_food    diet and allergies: personal data
 *                read by the person, admins, the leads of a circle that hosts, and the kitchen
 *
 * Nothing here goes into the second brain. An idea becomes knowledge only when its person suggests it as a
 * task: then it is a task idea on the board like any other.
 */

export type DailyWork = 'no' | 'part_time' | 'full_time'
export const DAILY_WORK: { id: DailyWork; label: string }[] = [
  { id: 'no', label: 'No' },
  { id: 'part_time', label: 'Yes, part-time' },
  { id: 'full_time', label: 'Yes, full-time' },
]

export type Diet = 'none' | 'vegetarian' | 'vegan' | 'gluten_free' | 'other'
export const DIETS: { id: Diet; label: string }[] = [
  { id: 'none', label: 'No restrictions' },
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'gluten_free', label: 'Gluten-free' },
  { id: 'other', label: 'Other' },
]

/** An idea or project someone would like to start; project_id once they suggested it as a task */
export interface Idea { id: string; title: string; project_id?: string | null }

export interface HostingAnswers {
  what_brings_you: string
  daily_work: DailyWork | ''
  exchange_experience: string
  ideas: Idea[]
  keep_posted: boolean
  diet: Diet[]
  diet_other: string
  allergies: string
}

export const NO_ANSWERS: HostingAnswers = {
  what_brings_you: '', daily_work: '', exchange_experience: '', ideas: [], keep_posted: false,
  diet: [], diet_other: '', allergies: '',
}

/** The questions, in one place for the profile and for booking */
export const QUESTIONS = {
  brings: `What brings you to ${COMMUNITY_NAME}?`,
  work: 'Do you have daily work commitments?',
  workHint: 'For outside or personal projects.',
  diet: 'Diet',
  allergies: 'Allergies',
  experience: 'Experience with work exchange, farms or communities',
  ideas: 'Ideas or projects you’d like to start here',
  keepPosted: 'Keep me posted',
  keepPostedHint: 'News and events by email.',
}

/** "No restrictions" stands alone; anything else replaces it */
export function toggleDiet(list: Diet[], id: Diet): Diet[] {
  if (list.includes(id)) return list.filter(d => d !== id)
  if (id === 'none') return ['none']
  return [...list.filter(d => d !== 'none'), id]
}

/** "Vegan, gluten-free" */
export function dietWords(a: Pick<HostingAnswers, 'diet' | 'diet_other'>): string {
  const words = a.diet.filter(d => d !== 'other').map(d => DIETS.find(x => x.id === d)?.label ?? d)
  if (a.diet.includes('other')) words.push(a.diet_other.trim() || 'Other')
  return words.map((w, i) => (i ? w.toLowerCase() : w)).join(', ')
}

/** Which of the four completion checks are answered ("Still to add" points to the rest) */
export interface HostingFacts { brings: boolean; work: boolean; food: boolean; experience: boolean }

export function hostingFacts(a: HostingAnswers): HostingFacts {
  return {
    brings: !!a.what_brings_you.trim(),
    work: !!a.daily_work,
    // Both: a diet picked and allergies answered ("None" is an answer)
    food: a.diet.length > 0 && !!a.allergies.trim(),
    experience: !!a.exchange_experience.trim(),
  }
}

const ideasOf = (v: unknown): Idea[] =>
  (Array.isArray(v) ? v : []).flatMap(x => {
    const i = x as Partial<Idea> | null
    return i && typeof i.title === 'string' && i.title.trim()
      ? [{ id: typeof i.id === 'string' ? i.id : crypto.randomUUID(), title: i.title, project_id: typeof i.project_id === 'string' ? i.project_id : null }]
      : []
  })

/**
 * One person's answers (your own, or someone's a host may read). `ready` is false when the tables aren't in
 * this community's database yet (the migration hasn't been applied): the answers are empty and can't be saved.
 */
export async function loadHostingAnswers(supabase: SupabaseClient, userId: string): Promise<{ answers: HostingAnswers; ready: boolean }> {
  const [intake, food] = await Promise.all([
    supabase.from('user_intake').select('what_brings_you, daily_work, exchange_experience, ideas, keep_posted').eq('user_id', userId).maybeSingle(),
    supabase.from('user_food').select('diet, diet_other, allergies').eq('user_id', userId).maybeSingle(),
  ])
  const i = intake.data as Record<string, unknown> | null
  const f = food.data as Record<string, unknown> | null
  const known = (v: unknown): v is Diet => DIETS.some(d => d.id === v)
  return {
    ready: !intake.error && !food.error,
    answers: {
      what_brings_you: (i?.what_brings_you as string | null) ?? '',
      daily_work: DAILY_WORK.some(d => d.id === i?.daily_work) ? (i?.daily_work as DailyWork) : '',
      exchange_experience: (i?.exchange_experience as string | null) ?? '',
      ideas: ideasOf(i?.ideas),
      keep_posted: i?.keep_posted === true,
      diet: ((f?.diet as unknown[] | null) ?? []).filter(known),
      diet_other: (f?.diet_other as string | null) ?? '',
      allergies: (f?.allergies as string | null) ?? '',
    },
  }
}

/** Saves your own answers. Returns what went wrong, in words for the screen, or null. */
export async function saveHostingAnswers(supabase: SupabaseClient, userId: string, a: HostingAnswers, was: { keep_posted: boolean }): Promise<string | null> {
  const ideas = a.ideas.filter(i => i.title.trim()).map(i => ({ id: i.id, title: i.title.trim().slice(0, 120), ...(i.project_id ? { project_id: i.project_id } : {}) }))
  const intake = await supabase.from('user_intake').upsert({
    user_id: userId,
    what_brings_you: a.what_brings_you.trim() || null,
    daily_work: a.daily_work || null,
    exchange_experience: a.exchange_experience.trim() || null,
    ideas,
    keep_posted: a.keep_posted,
    // When they last said yes; left alone otherwise
    ...(a.keep_posted && !was.keep_posted ? { keep_posted_at: new Date().toISOString() } : {}),
  }, { onConflict: 'user_id' })
  if (intake.error) return intake.error.message
  const food = await supabase.from('user_food').upsert({
    user_id: userId,
    diet: a.diet,
    diet_other: a.diet.includes('other') ? a.diet_other.trim() || null : null,
    allergies: a.allergies.trim() || null,
  }, { onConflict: 'user_id' })
  return food.error?.message ?? null
}

/** The four facts for the completion checks, for server pages (the menu's next step, your own profile).
 *  Null when the tables aren't in the database yet: then the checks don't count. */
export async function loadHostingFacts(supabase: SupabaseClient, userId: string): Promise<HostingFacts | null> {
  const { answers, ready } = await loadHostingAnswers(supabase, userId)
  return ready ? hostingFacts(answers) : null
}
