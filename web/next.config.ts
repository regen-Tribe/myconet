import type { NextConfig } from 'next'
import { loadInstance } from './scripts/instance.mjs'

const instance = loadInstance()

const nextConfig: NextConfig = {
  // Also set here so `next dev` shows the right name without a generated env file
  env: { NEXT_PUBLIC_COMMUNITY_NAME: instance.displayName },
  images: {
    remotePatterns: [
      // Avatars and other uploads come from this community's Supabase storage
      { protocol: 'https', hostname: new URL(instance.supabase.url).hostname },
    ],
  },
}

export default nextConfig

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
