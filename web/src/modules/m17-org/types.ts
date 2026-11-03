import type { CircleSlug } from '@/core/lib/circles'

export type UnitKind = 'circle' | 'team'
export type UnitRole = 'lead' | 'member'

export interface OrgPerson {
  id: string
  name: string
  username: string | null
}

export interface OrgUnit {
  id: string
  kind: UnitKind
  circle: CircleSlug
  name: string
  description: string | null
  sort_order: number
}

export interface OrgMember {
  unit_id: string
  user_id: string
  role: UnitRole
  title: string | null
  person: OrgPerson | null
}
