import { cache } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { CIRCLE_SELECT, circleSet, type Circle, type CircleSet } from './circles'

/** The community's circles, fetched once per request. */
export const loadCircleRows = cache(async (supabase: SupabaseClient): Promise<Circle[]> => {
  const { data } = await supabase.from('circles').select(CIRCLE_SELECT)
  return (data ?? []) as Circle[]
})

export async function loadCircles(supabase: SupabaseClient): Promise<CircleSet> {
  return circleSet(await loadCircleRows(supabase))
}
