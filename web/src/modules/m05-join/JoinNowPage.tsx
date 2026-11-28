import { createClient } from '@/core/lib/supabase/server'
import { loadBranding } from '@/core/lib/branding-server'
import { profileDetailsOf } from '@/core/lib/public-profile'
import { isJoiningOrAbove } from '@/core/lib/roles'
import JoinNow from './JoinNow'
import { SCREENS, type JoinNowProfile, type Screen } from './join-now-screens'

/**
 * `/join` with "joinAtOnce" (Sonia, 28 Nov 2026; design/decisions.md #107): the first onboarding. Loads the little it
 * needs: who is signed in, what they've answered so far, and whose invite link brought them (?invite=<username>).
 * `?preview=<screen>` shows a screen with a made-up person and saves nothing; local development only.
 */

const SAMPLE: JoinNowProfile = {
  first_name: 'Ana', last_name: 'Reyes', username: 'ana', headline: null, avatar_url: null, public_bio: null,
  city: null, country: null, user_types: null, show_to_members: false,
}

export default async function JoinNowPage({ searchParams }: { searchParams?: Promise<{ step?: string; invite?: string; preview?: string }> }) {
  const params = (await searchParams) ?? {}
  const supabase = await createClient()
  const branding = await loadBranding(supabase)
  const asked = SCREENS.find(s => s === params.step) ?? null

  // Whose link this is: the name is shown on Welcome and kept at sign-up. A name that matches nobody is dropped.
  const inviteName = (params.invite ?? '').trim().toLowerCase().slice(0, 60)
  const { data: inviter } = inviteName
    ? await supabase.from('user_profiles').select('username, first_name').ilike('username', inviteName).maybeSingle()
    : { data: null }

  const preview = process.env.NODE_ENV === 'development' ? SCREENS.find(s => s === params.preview) ?? null : null
  if (preview) {
    return <JoinNow preview userId={['welcome', 'signup', 'email'].includes(preview) ? null : 'preview'} role={preview === 'in' ? 'joining' : 'explorer'}
      profile={SAMPLE} email={preview === 'email' ? 'ana@example.com' : null} inviter={(inviter as { username: string; first_name: string | null } | null) ?? null}
      banner={branding.banner_url ?? null} initialScreen={preview} />
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return <JoinNow userId={null} role="explorer" profile={null} email={null}
      inviter={(inviter as { username: string; first_name: string | null } | null) ?? null}
      banner={branding.banner_url ?? null} initialScreen={asked === 'signup' ? 'signup' : 'welcome'} />
  }

  const [{ data: row }, details, { data: choice }] = await Promise.all([
    supabase.from('user_profiles').select('role, username, first_name, last_name, headline, avatar_url, public_bio, approved').eq('id', user.id).maybeSingle(),
    profileDetailsOf(supabase, user.id),
    // Its own query: until the migration is applied the column isn't there, and the rest must still load
    supabase.from('user_profiles').select('show_to_members').eq('id', user.id).maybeSingle(),
  ])
  const role = (row?.role as string | undefined) ?? 'explorer'
  // Someone an admin added (a guest who booked) and who has just claimed the account: the admin's note in the
  // headline ("Added by …") is not theirs, so the photo screen starts empty and replaces it
  const placeholder = row?.approved === false
  const profile: JoinNowProfile = {
    first_name: row?.first_name ?? null, last_name: row?.last_name ?? null, username: row?.username ?? null,
    headline: placeholder ? null : row?.headline ?? null, avatar_url: row?.avatar_url ?? null, public_bio: row?.public_bio ?? null,
    city: details.city, country: details.country, user_types: details.user_types,
    show_to_members: (choice as { show_to_members?: boolean } | null)?.show_to_members === true,
  }

  // Joined: "You're in" (the switch and the two cards stay reachable here). Exploring: the asked screen, or the
  // first one with nothing in it yet
  const mine: Screen[] = ['photo', 'world', 'more']
  const firstEmpty: Screen = !profile.headline ? 'photo' : !profile.public_bio ? 'world' : 'more'
  const initialScreen: Screen = isJoiningOrAbove(role) ? 'in' : asked && mine.includes(asked) ? asked : firstEmpty

  return <JoinNow userId={user.id} role={role} profile={profile} email={user.email ?? null} inviter={null} placeholder={placeholder}
    banner={branding.banner_url ?? null} initialScreen={initialScreen} />
}
