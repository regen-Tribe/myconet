import type { NextConfig } from 'next'
import { loadInstance } from './scripts/instance.mjs'

const instance = loadInstance()

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Avatars and other uploads come from this community's Supabase storage
      { protocol: 'https', hostname: new URL(instance.supabase.url).hostname },
    ],
  },
}

export default nextConfig

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
