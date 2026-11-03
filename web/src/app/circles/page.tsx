import { redirect } from 'next/navigation'

// M17 Circles (the org chart) lives at /org; /circles is the friendlier address
export default function CirclesPage() {
  redirect('/org')
}
