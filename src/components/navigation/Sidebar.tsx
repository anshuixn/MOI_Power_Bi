// ============================================================
// ReviewBand Sidebar — Glassmorphism + Edge Reveal + Edge Glow
// ============================================================

import { useState, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  MessageSquare,
  BarChart3,
  Tag,
  AlertTriangle,
  Sparkles,
  FileText,
  Settings,
  ChevronRight,
  Activity,
  PlayCircle
} from 'lucide-react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ReviewBandLogo } from './Logo'
import { useApp } from '@/hooks/useApp'

gsap.registerPlugin(useGSAP)

interface NavItem {
  label: string
  to: string
  icon: any
  badge?: string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Intro',       to: '/',            icon: PlayCircle },
  { label: 'Dashboard',   to: '/dashboard',   icon: LayoutDashboard },
  { label: 'Reviews',     to: '/reviews',     icon: MessageSquare },
  { label: 'Analytics',   to: '/analytics',   icon: BarChart3 },
  { label: 'Topics',      to: '/topics',      icon: Tag },
  { label: 'Complaints',  to: '/complaints',  icon: AlertTriangle, badge: '342' },
  { label: 'AI Insights', to: '/ai-insights', icon: Sparkles, badge: '2' },
  { label: 'Model Health',to: '/model-health',icon: Activity },
  { label: 'Reports',     to: '/reports',     icon: FileText },
  { label: 'Settings',    to: '/settings',    icon: Settings },
]

function NavItemComponent({ item }: { item: NavItem }) {
  const location = useLocation()
  const isActive = item.to === '/'
    ? location.pathname === '/'
    : location.pathname.startsWith(item.to)
  const Icon = item.icon
  const itemRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!itemRef.current) return
    const rect = itemRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    itemRef.current.style.setProperty('--mouse-x', `${x}px`)
    itemRef.current.style.setProperty('--mouse-y', `${y}px`)
  }

  return (
    <NavLink to={item.to} aria-current={isActive ? 'page' : undefined} style={{ textDecoration: 'none' }}>
      <div
        ref={itemRef}
        onMouseMove={handleMouseMove}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '9px 12px',
          borderRadius: 12,
          cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
          position: 'relative',
          userSelect: 'none',
          overflow: 'hidden', // Contain the radial highlight
          /* Active item gets stronger translucent purple glass */
          background: isActive
            ? 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(124,58,237,0.08))'
            : 'transparent',
          color: isActive ? '#7C3AED' : '#4B4466',
          fontWeight: isActive ? 600 : 400,
          fontSize: 14,
          boxShadow: isActive ? 'inset 0 1px 1px rgba(255,255,255,0.4), 0 2px 8px rgba(124,58,237,0.08)' : 'none',
          border: isActive ? '1px solid rgba(196,181,253,0.3)' : '1px solid transparent',
        }}
        className={isActive ? 'nav-item-active' : 'nav-item'}
      >
        {/* Pointer-following Radial Highlight */}
        <div
          aria-hidden="true"
          className="nav-item-highlight"
        />
        {/* Left active indicator bar - Thin illuminated accent */}
        {isActive && (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: -1,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 3,
              height: 20,
              borderRadius: '0 2px 2px 0',
              background: '#A855F7',
              boxShadow: '0 0 8px rgba(168,85,247,0.6)',
            }}
          />
        )}

        {/* Icon wrapper */}
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isActive
              ? 'rgba(168,85,247,0.15)'
              : 'transparent',
            transition: 'background 0.2s ease',
            flexShrink: 0,
          }}
        >
          <Icon size={16} strokeWidth={isActive ? 2 : 1.75} />
        </div>

        <span style={{ flex: 1 }}>{item.label}</span>

        {/* Glassmorphic Badges */}
        {item.badge && (
          <span
            style={{
              background: item.label === 'Complaints'
                ? 'rgba(248,113,113,0.12)'
                : 'rgba(124,58,237,0.12)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: item.label === 'Complaints'
                ? '1px solid rgba(248,113,113,0.2)'
                : '1px solid rgba(124,58,237,0.2)',
              color: item.label === 'Complaints' ? '#EF4444' : '#7C3AED',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
              fontSize: 10,
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: 999,
              lineHeight: 1.4,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {item.badge}
          </span>
        )}
      </div>
    </NavLink>
  )
}

export function Sidebar() {
  const { prefersReducedMotion } = useApp()
  const [isOpen, setIsOpen] = useState(false)
  const sidebarRef = useRef<HTMLElement>(null)
  const sweepRef = useRef<HTMLDivElement>(null)
  const leaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Track pointer position for subtle parallax
  const handleMouseMove = (e: React.MouseEvent) => {
    if (prefersReducedMotion || !isOpen || !sidebarRef.current) return
    const rect = sidebarRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    
    // Very subtle depth movement (max a few pixels)
    gsap.to(sidebarRef.current, {
      rotateY: (x - 0.5) * 2,
      rotateX: (0.5 - y) * 2,
      transformPerspective: 1000,
      duration: 0.5,
      ease: 'power2.out',
    })
  }

  const handleMouseLeaveInner = () => {
    if (!prefersReducedMotion && sidebarRef.current) {
      gsap.to(sidebarRef.current, {
        rotateY: 0,
        rotateX: 0,
        duration: 0.8,
        ease: 'power2.out',
      })
    }
  }

  const handleEnter = () => {
    if (leaveTimeout.current) clearTimeout(leaveTimeout.current)
    setIsOpen(true)
  }

  const handleLeave = () => {
    if (leaveTimeout.current) clearTimeout(leaveTimeout.current)
    // Delay/hysteresis before hiding
    leaveTimeout.current = setTimeout(() => {
      setIsOpen(false)
    }, 450)
  }

  // Keyboard accessibility
  const handleFocus = () => handleEnter()
  const handleBlur = (e: React.FocusEvent) => {
    if (!sidebarRef.current?.contains(e.relatedTarget as Node)) {
      handleLeave()
    }
  }

  useGSAP(() => {
    if (prefersReducedMotion) return

    const el = sidebarRef.current
    const sweep = sweepRef.current
    if (!el || !sweep) return

    if (isOpen) {
      // Reveal animation + Synchronized purple glow
      gsap.to(el, {
        x: 0,
        opacity: 1,
        backdropFilter: 'blur(24px) saturate(135%)',
        boxShadow: `
          12px 0 40px rgba(124, 58, 237, 0.15),
          4px 0 16px rgba(168, 85, 247, 0.10),
          inset -1px 0 2px rgba(255,255,255,0.8),
          inset 1px 0 2px rgba(255,255,255,0.8)
        `,
        duration: 0.5,
        ease: 'power3.out',
      })

      // Light sweep effect
      gsap.fromTo(sweep, 
        { x: '-100%', opacity: 0 },
        { x: '200%', opacity: 0.6, duration: 1.2, ease: 'power2.out', delay: 0.1 }
      )
    } else {
      // Hide animation
      gsap.to(el, {
        x: '-95%', // Translate almost completely outside
        opacity: 0.8,
        backdropFilter: 'blur(8px) saturate(100%)',
        boxShadow: '2px 0 8px rgba(0,0,0,0.02)',
        duration: 0.4,
        ease: 'power2.inOut',
      })
    }
  }, [isOpen, prefersReducedMotion])

  return (
    <>
      {/* Edge Trigger Zone */}
      <div
        data-testid="sidebar-edge-trigger"
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 20,
          height: '100vh',
          zIndex: 19,
        }}
        aria-hidden="true"
      />

      {/* Sidebar Container */}
      <aside
        ref={sidebarRef}
        id="reviewband-sidebar"
        aria-label="Main navigation"
        onMouseEnter={handleEnter}
        onMouseLeave={() => {
          handleMouseLeaveInner()
          handleLeave()
        }}
        onMouseMove={handleMouseMove}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={{
          width: 240,
          height: '100vh',
          position: 'fixed',
          top: 0,
          left: 0,
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(255, 255, 255, 0.65)',
          backdropFilter: prefersReducedMotion && isOpen ? 'blur(24px) saturate(135%)' : 'blur(8px) saturate(100%)',
          WebkitBackdropFilter: prefersReducedMotion && isOpen ? 'blur(24px) saturate(135%)' : 'blur(8px) saturate(100%)',
          transform: prefersReducedMotion
            ? (isOpen ? 'translateX(0)' : 'translateX(-95%)')
            : 'translateX(-95%)',
          opacity: prefersReducedMotion && isOpen ? 1 : 0.8,
          boxShadow: prefersReducedMotion
            ? (isOpen
              ? '12px 0 40px rgba(124, 58, 237, 0.15), 4px 0 16px rgba(168, 85, 247, 0.10), inset -1px 0 2px rgba(255,255,255,0.8), inset 1px 0 2px rgba(255,255,255,0.8)'
              : '2px 0 8px rgba(0,0,0,0.02)')
            : undefined,
          borderRight: '1px solid rgba(255, 255, 255, 0.70)',
          zIndex: 20,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {/* Light Sweep Highlight (Layer for entrance animation) */}
        <div
          ref={sweepRef}
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0, left: 0, bottom: 0, width: '40%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
            transform: 'skewX(-20deg)',
            pointerEvents: 'none',
            zIndex: 0,
            opacity: 0,
          }}
        />

        {/* Logo Area */}
        <div
          style={{
            padding: '20px 16px 16px',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 100%)',
            borderBottom: '1px solid rgba(255,255,255,0.5)',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <ReviewBandLogo size={28} />
        </div>

        {/* Navigation Area */}
        <nav
          style={{
            flex: 1,
            padding: '12px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {NAV_ITEMS.map(item => (
            <NavItemComponent key={item.to} item={item} />
          ))}
        </nav>

        {/* Glassmorphic Bottom CTA Card */}
        <div
          style={{
            margin: '8px 12px 16px',
            padding: '16px',
            borderRadius: 16,
            background: 'rgba(255, 255, 255, 0.50)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.8)',
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.9), 0 4px 12px rgba(124,58,237,0.08)',
            position: 'relative',
            overflow: 'hidden',
            zIndex: 1,
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            cursor: 'pointer',
          }}
          className="cta-card"
        >
          {/* Subtle lavender/green ambient color transmission */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(167,243,208,0.10))',
              zIndex: -1,
            }}
          />

          <p style={{ fontSize: 12, fontWeight: 700, color: '#1C1033', marginBottom: 2, lineHeight: 1.3 }}>
            Turn Customer Voices
          </p>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#1C1033', lineHeight: 1.3, marginBottom: 12 }}>
            into Growth
          </p>

          {/* Purple circular arrow button */}
          <button
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
              border: '1px solid rgba(196,181,253,0.5)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.3), 0 4px 12px rgba(124,58,237,0.4)',
              color: '#fff',
            }}
            aria-label="Learn more"
          >
            <ChevronRight size={15} strokeWidth={2.5} />
          </button>
        </div>

        <style>{`
          .nav-item {
            --mouse-x: -100px;
            --mouse-y: -100px;
          }
          .nav-item-active {
            --mouse-x: -100px;
            --mouse-y: -100px;
          }
          .nav-item-highlight {
            position: absolute;
            inset: 0;
            pointer-events: none;
            background: radial-gradient(100px circle at var(--mouse-x) var(--mouse-y), rgba(168,85,247,0.15), transparent 40%);
            opacity: 0;
            transition: opacity 0.3s ease;
            z-index: 0;
          }
          .nav-item:hover .nav-item-highlight,
          .nav-item-active:hover .nav-item-highlight {
            opacity: 1;
          }
          
          /* Elevated hover state */
          .nav-item:hover {
            background: rgba(255,255,255,0.5) !important;
            border-color: rgba(255,255,255,0.8) !important;
            box-shadow: inset 0 1px 2px rgba(255,255,255,0.9), 0 4px 12px rgba(124,58,237,0.08) !important;
            transform: translateY(-1px) translateZ(10px);
            color: #1C1033 !important;
          }
          .nav-item-active:hover {
            transform: translateY(-1px) translateZ(10px);
            box-shadow: inset 0 1px 2px rgba(255,255,255,0.9), 0 6px 16px rgba(124,58,237,0.15) !important;
          }
          .nav-item > *, .nav-item-active > * {
            position: relative;
            z-index: 1;
          }
          .cta-card:hover {
            transform: translateY(-2px);
            box-shadow: inset 0 1px 1px rgba(255,255,255,0.9), 0 8px 20px rgba(124,58,237,0.12) !important;
          }
        `}</style>
      </aside>

      <button
        type="button"
        data-testid="sidebar-menu-trigger"
        aria-label={isOpen ? 'Close dashboard navigation' : 'Open dashboard navigation'}
        aria-controls="reviewband-sidebar"
        aria-expanded={isOpen}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onClick={() => setIsOpen(open => !open)}
        onFocus={handleFocus}
        onBlur={handleLeave}
        style={{
          position: 'fixed',
          left: 8,
          top: 12,
          width: 32,
          height: 40,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          padding: 0,
          border: '1px solid rgba(196,181,253,0.38)',
          borderRadius: 10,
          background: 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 4px 16px rgba(28,16,51,0.10)',
          cursor: 'pointer',
          zIndex: 31,
          transition: 'background 0.2s ease',
        }}
      >
        <span aria-hidden="true" style={{ width: 16, height: 2, borderRadius: 2, background: '#4B4466' }} />
        <span aria-hidden="true" style={{ width: 16, height: 2, borderRadius: 2, background: '#4B4466' }} />
        <span aria-hidden="true" style={{ width: 16, height: 2, borderRadius: 2, background: '#4B4466' }} />
      </button>
    </>
  )
}
