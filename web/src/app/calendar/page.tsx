import { redirect } from 'next/navigation'

// The calendar lives at /events; /calendar is the friendlier address
export default async function CalendarPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const qs = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (Array.isArray(v) ? v : v ? [v] : []).map(x => [k, x])))
  redirect(`/events${qs.size ? `?${qs}` : ''}`)
}
