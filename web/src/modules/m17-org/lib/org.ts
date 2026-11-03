/**
 * Who can edit the org chart. Mirrors `private.can_lead_circle` /
 * `private.can_edit_org_unit` — the database has the final say.
 */

import type { OrgMember, OrgPerson, OrgUnit } from '../types'

/** Admin, or a circle lead of this circle. */
export function canLeadCircle(circle: string, role: string, leadCircles: string[]): boolean {
  return role === 'admin' || (role === 'circle_lead' && leadCircles.includes(circle))
}

/** Circle editors, plus a team's own leads for that team. */
export function canEditUnit(unit: OrgUnit, members: OrgMember[], userId: string | null, role: string, leadCircles: string[]): boolean {
  if (!userId) return false
  if (canLeadCircle(unit.circle, role, leadCircles)) return true
  return unit.kind === 'team' && members.some(m => m.unit_id === unit.id && m.user_id === userId && m.role === 'lead')
}

export const MEMBER_SELECT = 'unit_id, user_id, role, title, person:user_profiles!org_unit_members_user_id_fkey(id, first_name, last_name, username)'

export function toPerson(p: any): OrgPerson | null {
  if (!p) return null
  const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.username || 'Member'
  return { id: p.id, name, username: p.username ?? null }
}

export function toMember(row: any): OrgMember {
  const p = Array.isArray(row.person) ? row.person[0] : row.person
  return { unit_id: row.unit_id, user_id: row.user_id, role: row.role, title: row.title, person: toPerson(p) }
}
