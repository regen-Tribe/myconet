'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { isCircleAdmin, isJoiningOrAbove } from '@/core/lib/roles'
import { isMenuActive, menuGroups, type MenuItem } from '@/core/lib/nav'
import { COMMUNITY_NAME } from '@/core/lib/instance'
import type { MenuState } from '@/core/lib/menu-server'
import { Icon } from '@/core/components/v4'

/**
 * The v4 menu (Sonia, 19 Nov; design/redesign-prototype/app.js › navHTML), used when
 * the community sets "design": "v4". The next step on top, then You, Community,
 * Working together and Admin. Today's AppSideNav stays for everyone else.
 */

const LABEL: React.CSSProperties = {
  fontSize: 10.5, fontWeight: 400, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--ink-4)',
}

const JOURNEY = ['Explorer', 'Joining member', 'Member']

function NextStepCard({ state, onClose }: { state: MenuState; onClose?: () => void }) {
  const n = state.next
  if (!n) return null
  const showJourney = state.journey === 0 || state.journey === 1
  return (
    <div style={{ margin: '4px 0 6px' }}>
      <Link
        href={n.href}
        onClick={onClose}
        className="menu-next"
        style={{
          display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none',
          background: 'var(--action, var(--accent-soft))', color: 'var(--action-ink, var(--ink))',
          borderRadius: 14, padding: '10px 8px 10px 14px',
        }}
      >
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ ...LABEL, display: 'block', color: 'inherit', opacity: 0.7, marginBottom: 2 }}>Your next step</span>
          <span style={{ display: 'block', fontSize: 14, fontWeight: 600, lineHeight: 1.25 }}>{n.title}</span>
          {showJourney && (
            // Where you are on the way in (orientation review O3)
            <span style={{ display: 'block', marginTop: 8 }} aria-label={`Step ${state.journey! + 1} of 3: ${JOURNEY[state.journey!]}`}>
              <span style={{ display: 'flex', gap: 4 }} aria-hidden="true">
                {JOURNEY.map((s, i) => (
                  <span key={s} style={{ flex: 1, height: 4, borderRadius: 4, background: i <= state.journey! ? 'currentColor' : 'color-mix(in srgb, currentColor 22%, transparent)' }} />
                ))}
              </span>
              <span style={{ display: 'block', fontSize: 11, marginTop: 5, opacity: 0.8 }} aria-hidden="true">
                Step {state.journey! + 1} of 3 · {JOURNEY[state.journey!]}
              </span>
            </span>
          )}
          <span style={{ display: 'block', fontSize: 12, lineHeight: 1.4, marginTop: 4, opacity: 0.8 }}>{n.line}</span>
        </span>
        <span style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--action-ink, var(--ink))', color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Icon name="right" size={15} />
        </span>
      </Link>
      {n.alt && (
        <div style={{ fontSize: 12, color: 'var(--ink-3)', padding: '6px 4px 0' }}>
          Have an account? <Link href={n.alt.href} onClick={onClose} style={{ color: 'var(--ink)', fontWeight: 600 }}>{n.alt.label}</Link>
        </div>
      )}
    </div>
  )
}

function Item({ item, active, locked, count, onClose }: {
  item: MenuItem; active: boolean; locked: boolean; count?: number; onClose?: () => void
}) {
  const row: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', borderRadius: 10,
    fontSize: 13.5, textDecoration: 'none',
    color: locked ? 'var(--ink-4)' : active ? 'var(--blue-ink, var(--ink))' : 'var(--ink-2)',
    fontWeight: active ? 600 : 400,
    background: active ? 'var(--blue, var(--bg-3))' : 'transparent',
  }
  const icon = <span style={{ display: 'grid', placeItems: 'center', color: active ? 'inherit' : 'var(--ink-3)' }}><Icon name={item.icon} /></span>

  if (locked) {
    // Locked items say why (O5); they aren't links, since the page would turn the person away
    const why = 'Opens when you’re a joining member'
    return (
      <span role="link" aria-disabled="true" title={why} style={{ ...row, cursor: 'default' }}>
        {icon}
        <span>{item.name}<span className="sr-only"> ({why})</span></span>
        <span style={{ marginLeft: 'auto', display: 'grid', placeItems: 'center' }}><Icon name="lock" size={14} /></span>
      </span>
    )
  }

  return (
    <Link
      href={item.href}
      onClick={e => {
        onClose?.()
        // The page you're already on: load it fresh, its front page with the latest data (v4.38.2)
        if (active && !e.metaKey && !e.ctrlKey && !e.shiftKey) { e.preventDefault(); window.location.assign(item.href) }
      }}
      aria-current={active ? 'page' : undefined}
      className="sh-nav-item"
      style={row}
    >
      {icon}
      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
      {count !== undefined && (
        <span style={{
          marginLeft: 'auto', minWidth: 20, height: 20, padding: '0 6px', borderRadius: 999, display: 'grid', placeItems: 'center',
          fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', background: 'var(--surface)', boxShadow: 'inset 0 0 0 1px var(--rule)',
        }}>{count}</span>
      )}
    </Link>
  )
}

export default function MenuV4({ mobileOpen, onClose, role, isLoggedIn, state }: {
  mobileOpen?: boolean; onClose?: () => void; role: string; isLoggedIn: boolean; state: MenuState
}) {
  const pathname = usePathname()
  const joined = isLoggedIn && isJoiningOrAbove(role)
  // Explorers, joining members and visitors get a line under each group (O7)
  const newcomer = state.journey !== 2

  const countFor = (key: string): number | undefined => {
    if (key === 'dashboard') return joined ? state.counts.tasks : undefined
    if (key === 'applications') return state.counts.applications || undefined
    if (key === 'bookings') return state.counts.bookings || undefined
    return undefined
  }

  return (
    <nav
      aria-label="Menu"
      className={`app-shell-sidenav menu-v4${mobileOpen ? ' mobile-open' : ''}`}
      style={{ borderRight: '1px solid var(--rule)', background: 'var(--surface)', padding: '14px 12px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}
    >
      <div className="mobile-nav-header" style={{ alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={LABEL}>Menu</span>
        <button onClick={onClose} aria-label="Close the menu" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 18, lineHeight: 1, padding: '2px 6px' }}>✕</button>
      </div>

      {/* My dashboard shows its own next step (DashboardV4), so the menu doesn't repeat it there (O3) */}
      {pathname !== '/dashboard' && <NextStepCard state={state} onClose={onClose} />}

      {menuGroups(COMMUNITY_NAME).map(g => {
        const items = g.items.filter(i => !i.admin || isCircleAdmin(role))
        if (!items.length) return null
        return (
          <div key={g.label} role="group" aria-label={g.label}>
            <div style={{ ...LABEL, margin: '20px 10px 4px' }}>{g.label}</div>
            {newcomer && g.line && <div style={{ fontSize: 11, color: 'var(--ink-4)', margin: '0 10px 6px' }}>{g.line}</div>}
            {items.map(i => (
              <Item
                key={i.key}
                item={i}
                active={isMenuActive(i.href, pathname)}
                locked={!!i.joiningUp && !joined}
                count={countFor(i.key)}
                onClose={onClose}
              />
            ))}
          </div>
        )
      })}
    </nav>
  )
}
