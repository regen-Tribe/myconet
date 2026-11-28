import { JOIN_AT_ONCE } from './instance'

/**
 * Who is listed on Members, in search and in the people counts. `approved` is an admin's (people an admin added
 * wait until approved, 20261223000000); with "joinAtOnce" each person also chooses it themselves, "Show me to other
 * members" (`show_to_members`, off until they say yes; Sonia, 28 Nov 2026, decision #107). A listing rule, not a
 * security boundary: calendars and pickers still show the name. Use as `.match(LISTED)`.
 */
export const LISTED: Record<string, boolean> = JOIN_AT_ONCE
  ? { approved: true, show_to_members: true }
  : { approved: true }
