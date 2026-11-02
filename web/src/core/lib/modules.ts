export type Module = {
  num: string
  name: string
  desc: string
  icon: string
  color: string
  href: string | null
  live: boolean
  version?: string
  external?: boolean
}

export const MODULES: Module[] = [
  {
    num: '00', name: 'MyCoNet Dashboard',
    desc: 'Personal heads-up display — all your community information in one place, scoped to your role.',
    icon: '◎', color: '#18181b', href: '/dashboard', live: true,
  },
  {
    num: '01', name: 'Community Network',
    desc: 'Profile-based discovery with AI matching for seekers, vision holders, providers, and resource holders.',
    icon: '🌐', color: '#92400e', href: '/network', live: true,
  },
  {
    num: '02', name: 'Neighborhood Directory',
    desc: 'Live map of regenerative neighborhoods. Community profiles, milestones, events, and guest book.',
    icon: '🗺', color: '#b91c1c', href: 'https://tribesplatform.app/neighborhoods/', live: true, version: 'v1', external: true,
  },
  {
    num: '03', name: 'Resources & Tools',
    desc: 'Curated archive of regenerative guides, tools, case studies, and templates — smart-tagged by AI.',
    icon: '📚', color: '#ea580c', href: 'https://tribesplatform.app/hive/', live: true, version: 'v1', external: true,
  },
  {
    num: '04', name: 'Blueprint',
    desc: 'Guided planning through SPARK → PROVE → BUILD → LIVE with 5 pillars and milestone gates.',
    icon: '🗺', color: '#ca8a04', href: '/blueprint', live: true,
  },
  {
    num: '05', name: 'Join',
    desc: 'Application and full onboarding flow — from initial inquiry to community welcome.',
    icon: '🚪', color: '#15803d', href: '/join', live: true,
  },
  {
    num: '06', name: 'Agreements',
    desc: 'Browse open projects and propose collaboration — describe what you\'ll do and what you expect in return.',
    icon: '📋', color: '#1d4ed8', href: '/agreements', live: true,
  },
  {
    num: '07', name: 'Operations',
    desc: 'Active community projects with updates. Admin manages projects; members see what\'s happening.',
    icon: '⚙️', color: '#4338ca', href: '/ops', live: true,
  },
  {
    num: '08', name: 'Contribution Tracking',
    desc: 'Points, badges, and reputation that make regenerative action visible and rewarding.',
    icon: '✦', color: '#7c3aed', href: null, live: false,
  },
  {
    num: '09', name: 'Governance',
    desc: 'AI-facilitated governance — mediates conflicts, surfaces proposals, guides decisions.',
    icon: '⚖️', color: '#db2777', href: null, live: false,
  },
  {
    num: '10', name: 'Genesis Bot',
    desc: 'Telegram bridge — members request database changes via chat with leadership approval.',
    icon: '🤖', color: '#e2e8f0', href: null, live: false,
  },
  {
    num: '11', name: 'Quinn',
    desc: 'Personal AI guide per member — daily reminders, goal tracking, and community routing.',
    icon: '◇', color: '#94a3b8', href: null, live: false,
  },
  {
    num: '12', name: 'MycoNet Agent',
    desc: 'The community brain — reads all modules, connects the dots, runs the approval queue.',
    icon: '✦', color: '#d97706', href: null, live: false,
  },
  {
    num: '13', name: 'Hive',
    desc: 'Inter-community layer — shared resources, collaboration, and mutual aid across neighborhoods.',
    icon: '⬡', color: '#0891b2', href: null, live: false,
  },
  {
    num: '14', name: 'Events',
    desc: 'Community calendar — core events from members and leads, community hosted events from anyone joining, with RSVPs.',
    icon: '🗓', color: '#0d9488', href: '/events', live: true,
  },
  {
    num: '15', name: 'Bookings',
    desc: 'Shared inventory — book accommodation, tools and spaces. Admins and circle leads manage what can be booked.',
    icon: '🔑', color: '#c2410c', href: '/bookings', live: true,
  },
]
