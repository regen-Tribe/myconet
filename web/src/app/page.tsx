import { createClient } from '@/core/lib/supabase/server'
import { redirect } from 'next/navigation'
import LandingClient from './LandingClient'
import { EVENT_SELECT, toEvent } from '@/modules/m14-events/lib/queries'
import { ACTIVE_PROJECT_STATUSES } from '@/core/lib/project-status'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) redirect('/home')

  const { data: bp } = await supabase
    .from('blueprints')
    .select('answers')
    .eq('is_community', true)
    .maybeSingle()
  const communityPurpose = ((bp?.answers as Record<string, unknown>)?.purpose as string) || null

  // Visitors are logged out here, so RLS returns public events only
  const { data: eventRows } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .gte('starts_at', new Date(Date.now() - 86400000).toISOString())
    .order('starts_at', { ascending: true })
    .limit(10)

  const [members, projects, deliverables, proposals] = await Promise.all([
    supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
    supabase.from('projects').select('id', { count: 'exact', head: true }).in('status', [...ACTIVE_PROJECT_STATUSES]),
    supabase.from('deliverables').select('id', { count: 'exact', head: true }),
    supabase.from('proposals').select('id', { count: 'exact', head: true }).eq('status', 'open'),
  ])
  const stats = {
    members: members.count ?? 0,
    activeProjects: projects.count ?? 0,
    deliverables: deliverables.count ?? 0,
    openProposals: proposals.count ?? 0,
  }

  return <LandingClient firstName={null} communityPurpose={communityPurpose} upcomingEvents={(eventRows ?? []).map(toEvent)} stats={stats} />
}
