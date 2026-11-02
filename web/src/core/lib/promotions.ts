import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Promotes a joining user to member if they qualify via either path:
 *   1. They have an accepted/active/completed collaboration agreement
 *   2. They created a project that has been accepted onto the board
 *
 * Runs in the database (`promote_to_member_if_eligible()`), because users
 * can't change their own role. Awards the community_member achievement.
 * Returns the new role ('member' if promoted, original role otherwise).
 */
export async function promoteToMemberIfEligible(
  supabase: SupabaseClient,
  _userId: string,
  currentRole: string,
): Promise<string> {
  if (currentRole !== 'joining') return currentRole
  const { data, error } = await supabase.rpc('promote_to_member_if_eligible')
  return error || typeof data !== 'string' ? currentRole : data
}
