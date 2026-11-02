/**
 * Who can post and edit events. Mirrors the `events` RLS policies:
 *   - community events: joining members and above
 *   - core events: full members, leads, advisors, admins
 *   - edit/delete: the creator, an admin, or a circle lead for the event's circle
 */

import { isFullMember, isJoiningOrAbove } from '@/core/lib/roles'
import type { CalendarEvent, EventKind } from '../types'

export function canCreateKind(kind: EventKind, role: string): boolean {
  return kind === 'core' ? isFullMember(role) : isJoiningOrAbove(role)
}

export function canEditEvent(
  e: Pick<CalendarEvent, 'created_by' | 'circle'>, userId: string | null, role: string, leadCircles: string[],
): boolean {
  if (!userId) return false
  if (e.created_by === userId || role === 'admin') return true
  return role === 'circle_lead' && !!e.circle && leadCircles.includes(e.circle)
}

export const KIND_META: Record<EventKind, { label: string; short: string; blurb: string }> = {
  core: {
    label: 'Core events',
    short: 'Core',
    blurb: 'Official community events posted by members, circle leads and project leads.',
  },
  community: {
    label: 'Community hosted',
    short: 'Community',
    blurb: 'Events hosted by anyone in the community, including joining members.',
  },
}

export function isEventKind(v: string | undefined): v is EventKind {
  return v === 'core' || v === 'community'
}
