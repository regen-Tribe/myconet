import { redirect } from 'next/navigation'

// The old onboarding wizard wrote to profile columns that no longer exist.
// Profile setup lives in the profile editor now.
export default function OnboardingPage() {
  redirect('/profile/edit')
}
