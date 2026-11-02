import type { Booking, BookingItem } from '../types'

export const ITEM_SELECT = 'id, name, description, category, tags, circle, location, capacity, requires_approval, is_active, created_by'

export const BOOKING_SELECT = 'id, item_id, user_id, starts_at, ends_at, status, note, created_at, person:user_profiles!bookings_user_id_fkey(first_name, username)'

export function toItem(row: any): BookingItem {
  return { ...row, tags: row.tags ?? [] }
}

export function toBooking(row: any): Booking {
  return { ...row, person: Array.isArray(row.person) ? row.person[0] ?? null : row.person ?? null }
}
