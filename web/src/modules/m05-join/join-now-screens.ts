/** The first onboarding's screens, in order (JoinNow.tsx). A plain module, so the server page can read them too. */
export const SCREENS = ['welcome', 'signup', 'email', 'photo', 'world', 'more', 'in'] as const
export type Screen = (typeof SCREENS)[number]

export interface JoinNowProfile {
  first_name: string | null; last_name: string | null; username: string | null
  headline: string | null; avatar_url: string | null; public_bio: string | null
  city: string | null; country: string | null; user_types: string[] | null
  show_to_members: boolean
}

/** Set when signing up found the address already known: the set-password page then comes back to /join */
export const CLAIM_KEY = 'jn-claim'
