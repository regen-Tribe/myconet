import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import AppShell from '@/core/components/shell/AppShell'
import { createClient } from '@/core/lib/supabase/server'
import { loadCircleRows } from '@/core/lib/circles-server'
import { CirclesProvider } from '@/core/components/CirclesProvider'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: 'MyCoNet — MyCommunityNetwork',
  description: 'The member portal for your regenerative community. Connect, plan, and build together.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const [{ data: { user } }, circles] = await Promise.all([supabase.auth.getUser(), loadCircleRows(supabase)])

  let role = 'explorer'
  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    role = profile?.role ?? 'explorer'
  }

  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `(function(){var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t;})()`
        }} />
      </head>
      <body>
        <CirclesProvider rows={circles}>
          <AppShell role={role} isLoggedIn={!!user}>{children}</AppShell>
        </CirclesProvider>
      </body>
    </html>
  )
}
