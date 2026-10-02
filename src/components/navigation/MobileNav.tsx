// ============================================================
// Mobile Bottom Navigation
// ============================================================

import { NavLink } from 'react-router-dom'
import { LayoutDashboard, MessageSquare, BarChart3, Sparkles, Settings } from 'lucide-react'

const MOBILE_NAV = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Reviews', to: '/reviews', icon: MessageSquare },
  { label: 'Analytics', to: '/analytics', icon: BarChart3 },
  { label: 'Insights', to: '/ai-insights', icon: Sparkles },
  { label: 'Settings', to: '/settings', icon: Settings },
]

export function MobileNav() {
  return (
    <nav
      aria-label="Mobile navigation"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(221,228,238,0.8)',
        display: 'flex',
        alignItems: 'center',
        zIndex: 20,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {MOBILE_NAV.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          style={{ flex: 1, textDecoration: 'none' }}
        >
          {({ isActive }) => {
            const Icon = item.icon
            return (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  padding: '8px 4px',
                  color: isActive ? '#F5821F' : '#6B7280',
                }}
              >
                <Icon size={20} strokeWidth={isActive ? 2 : 1.75} />
                <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400 }}>
                  {item.label}
                </span>
              </div>
            )
          }}
        </NavLink>
      ))}
    </nav>
  )
}
