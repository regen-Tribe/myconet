export type EventKind = 'core' | 'community' | 'task'
export type RsvpStatus = 'going' | 'maybe'

export interface PersonLite {
  first_name: string | null
  username: string | null
}

export interface CalendarEvent {
  id: string
  title: string
  description: string | null
  location: string | null
  online_url: string | null
  starts_at: string
  ends_at: string | null
  all_day: boolean
  kind: EventKind
  is_public: boolean
  circle: string | null
  project_id: string | null
  proposal_id: string | null
  created_by: string
  creator: PersonLite | null
  project: { id: string; title: string } | null
  proposal: { id: string; title: string } | null
}

export interface EventRsvp {
  event_id: string
  user_id: string
  status: RsvpStatus
  person: PersonLite | null
}

/** Options for the link pickers in the event form. */
export interface LinkOption {
  id: string
  title: string
  circle?: string | null
}

export type EventsView = 'month' | 'week' | 'list'
