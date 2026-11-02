import { createClient } from '@/core/lib/supabase/server'
import BookingsClient from './BookingsClient'
import { isCategory, SCOPE_META, type BookingScope } from './lib/inventory'
import { BOOKING_SELECT, ITEM_SELECT, toBooking, toItem } from './lib/queries'
import type { BookingsTab } from './types'

const TABS: BookingsTab[] = ['browse', 'mine', 'manage']

export type BookingsSearchParams = { tab?: string; category?: string; item?: string }

/** Shared loader for both booking modules; the scope picks which categories show. */
export async function renderBookings(scope: BookingScope, sp: BookingsSearchParams) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let role = 'explorer'
  let leadCircles: string[] = []
  let me: { first_name: string | null; username: string | null } | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, lead_circles, first_name, username')
      .eq('id', user.id)
      .maybeSingle()
    role = profile?.role ?? 'explorer'
    leadCircles = profile?.lead_circles ?? []
    me = { first_name: profile?.first_name ?? null, username: profile?.username ?? null }
  }

  // RLS: everyone sees active items (leads also see archived); joining+ see the
  // whole schedule, explorers only their own bookings, visitors none
  const since = new Date(Date.now() - 90 * 86400000).toISOString()
  const [itemsRes, bookingsRes] = await Promise.all([
    supabase.from('booking_items').select(ITEM_SELECT).order('name'),
    user
      ? supabase.from('bookings').select(BOOKING_SELECT).gte('ends_at', since).order('starts_at')
      : Promise.resolve({ data: [] }),
  ])
  const items = (itemsRes.data ?? []).map(toItem)
  const inScope = (id: string | undefined) => items.some(i => i.id === id && SCOPE_META[scope].categories.includes(i.category))

  return (
    <BookingsClient
      scope={scope}
      initialItems={items}
      initialBookings={((bookingsRes as { data: unknown[] | null }).data ?? []).map(toBooking)}
      userId={user?.id ?? null}
      me={me}
      role={role}
      leadCircles={leadCircles}
      initialTab={TABS.find(t => t === sp.tab) ?? 'browse'}
      initialCategory={isCategory(sp.category) && SCOPE_META[scope].categories.includes(sp.category) ? sp.category : null}
      initialItemId={inScope(sp.item) ? sp.item! : null}
    />
  )
}
