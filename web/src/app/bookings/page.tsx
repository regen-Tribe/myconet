import { createClient } from '@/core/lib/supabase/server'
import BookingsClient from '@/modules/m15-bookings/BookingsClient'
import { isCategory } from '@/modules/m15-bookings/lib/inventory'
import { BOOKING_SELECT, ITEM_SELECT, toBooking, toItem } from '@/modules/m15-bookings/lib/queries'
import type { BookingsTab } from '@/modules/m15-bookings/types'

const TABS: BookingsTab[] = ['browse', 'mine', 'manage']

export default async function BookingsPage({ searchParams }: {
  searchParams: Promise<{ tab?: string; category?: string; item?: string }>
}) {
  const sp = await searchParams
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

  return (
    <BookingsClient
      initialItems={items}
      initialBookings={((bookingsRes as { data: unknown[] | null }).data ?? []).map(toBooking)}
      userId={user?.id ?? null}
      me={me}
      role={role}
      leadCircles={leadCircles}
      initialTab={TABS.find(t => t === sp.tab) ?? 'browse'}
      initialCategory={isCategory(sp.category) ? sp.category : null}
      initialItemId={items.some(i => i.id === sp.item) ? sp.item! : null}
    />
  )
}
