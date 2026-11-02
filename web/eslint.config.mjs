import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const config = [
  ...nextVitals,
  ...nextTs,
  { ignores: ['.next/**', '.open-next/**', 'node_modules/**', 'next-env.d.ts', 'cloudflare-env.d.ts'] },
  {
    // House style: Supabase rows are often loosely typed, JSX copy uses plain
    // apostrophes, avatars are <img> from Supabase storage, and server pages
    // compute "now" during render.
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'react/no-unescaped-entities': 'off',
      '@next/next/no-img-element': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
]

export default config
