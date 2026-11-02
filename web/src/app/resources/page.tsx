import { redirect } from 'next/navigation'

// M16 Resources lives at /bookings; /resources is the friendlier address
export default async function ResourcesAlias({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const qs = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (Array.isArray(v) ? v : v ? [v] : []).map(x => [k, x])))
  redirect(`/bookings${qs.size ? `?${qs}` : ''}`)
}
