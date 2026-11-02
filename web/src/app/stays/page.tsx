import { renderBookings, type BookingsSearchParams } from '@/modules/m15-bookings/BookingsPage'

/** M15 Accommodation — guest rooms, cabins, tent sites. Everything else lives at /bookings (M16). */
export default async function StaysPage({ searchParams }: { searchParams: Promise<BookingsSearchParams> }) {
  return renderBookings('stays', await searchParams)
}
