/**
 * This community's identity, from instance/config.jsonc (inlined at build time
 * by scripts/instance.mjs). Core code must never hard-code a community's name.
 */

/** Short name, e.g. "Regen Hood 0". Used for login, headers and branding. */
export const COMMUNITY_NAME = process.env.NEXT_PUBLIC_COMMUNITY_NAME || 'Our community'

/** The Blueprint's working name for the neighborhood, falling back to the short name. */
export function communityName(answers: Record<string, unknown> | null | undefined): string {
  const name = answers?.project_name
  return typeof name === 'string' && name.trim() ? name.trim() : COMMUNITY_NAME
}

/** Framework credit shown on every MyCoNet community (footers, Blueprint exports). */
export const FRAMEWORK_CREDIT = 'MyCoNet · Regenerative Neighborhood Framework · Open sourced by The Regen Tribe Collective'
