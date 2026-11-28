import { redirect } from 'next/navigation'
import { DESIGN_REVIEW, JOIN_AT_ONCE } from '@/core/lib/instance'
import AuthPage from '../login/page'

// Every "Create account" links here. With the design review it opens the Create account form itself (#65);
// without it, it still sends people to sign in, as before.
export default function SignupPage() {
  // Joining at once: Sign up is the first onboarding's own screen (name, email, password; decision #107)
  if (JOIN_AT_ONCE) redirect('/join?step=signup')
  if (!DESIGN_REVIEW) redirect('/auth/login')
  return <AuthPage />
}
