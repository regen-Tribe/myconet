import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchCircleDirectory } from '@/core/lib/ops-permissions'
import type { CirclesPreviewData, PreviewItem } from '../ModulePreviews'

/** Data for the M15/M16/M17 previews on `/` and `/home` (all publicly readable). */
export async function loadModulePreviews(supabase: SupabaseClient): Promise<{ items: PreviewItem[]; circles: CirclesPreviewData }> {
  const [itemsRes, teamsRes, directory] = await Promise.all([
    supabase.from('booking_items').select('id, name, category, tags, location, capacity').eq('is_active', true).order('name').limit(40),
    supabase.from('org_units').select('circle, name').eq('kind', 'team').order('sort_order'),
    fetchCircleDirectory(supabase),
  ])
  const teams: Partial<Record<string, string[]>> = {}
  for (const t of teamsRes.data ?? []) (teams[t.circle] ??= []).push(t.name)
  return {
    items: (itemsRes.data ?? []).map(i => ({ ...i, tags: i.tags ?? [] })) as PreviewItem[],
    circles: { directory, teams },
  }
}
