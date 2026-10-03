// ============================================================
// Mobile Bottom Navigation
// ============================================================

import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import { LayoutDashboard, MessageSquare, BarChart3, Sparkles, MoreHorizontal } from 'lucide-react'

const MOBILE_NAV = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Reviews', to: '/reviews', icon: MessageSquare },
  { label: 'Analytics', to: '/analytics', icon: BarChart3 },
  { label: 'Insights', to: '/ai-insights', icon: Sparkles },
]

const MORE_LINKS = [
  { label: 'Topics', to: '/topics' },
  { label: 'Complaints', to: '/complaints' },
  { label: 'Model Health', to: '/model-health' },
  { label: 'Reports', to: '/reports' },
  { label: 'Settings', to: '/settings' },
]

export function MobileNav() {
  const [isMoreOpen, setIsMoreOpen] = useState(false)

  return (
    <>
      {isMoreOpen && (
        <>
          <button
            type="button"
            aria-label="Close more navigation"
            onClick={() => setIsMoreOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 19, border: 0, background: 'transparent' }}
          />
          <div
            role="menu"
            aria-label="More pages"
            style={{
              position: 'fixed',
              right: 12,
              bottom: 76,
              zIndex: 21,
              width: 196,
              padding: 8,
              borderRadius: 14,
              background: 'rgba(255,255,255,0.96)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 12px 36px rgba(28,16,51,0.16)',
              border: '1px solid rgba(196,181,253,0.3)',
            }}
          >
            {MORE_LINKS.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                role="menuitem"
                onClick={() => setIsMoreOpen(false)}
                style={({ isActive }) => ({
                  display: 'block',
                  padding: '10px 12px',
                  borderRadius: 8,
                  textDecoration: 'none',
                  color: isActive ? '#7C3AED' : '#4B4466',
                  background: isActive ? 'rgba(124,58,237,0.08)' : 'transparent',
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                })}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </>
      )}

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
                    color: isActive ? '#7C3AED' : '#6B7280',
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
        <button
          type="button"
          aria-label="More navigation"
          aria-haspopup="menu"
          aria-expanded={isMoreOpen}
          onClick={() => setIsMoreOpen(open => !open)}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            padding: '8px 4px',
            color: isMoreOpen ? '#7C3AED' : '#6B7280',
            border: 0,
            background: 'transparent',
            font: 'inherit',
          }}
        >
          <MoreHorizontal size={20} />
          <span style={{ fontSize: 10 }}>More</span>
        </button>
      </nav>
    </>
  )
}
