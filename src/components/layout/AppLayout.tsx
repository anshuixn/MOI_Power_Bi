// ============================================================
// App Layout Shell — Sidebar + TopBar + Main content
// Includes the 3D floating sphere from the reference design
// ============================================================

import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useApp } from '@/hooks/useApp'
import { useLocation } from 'react-router-dom'
import { Sidebar } from '../navigation/Sidebar'
import { TopBar } from '../navigation/TopBar'
import { MobileNav } from '../navigation/MobileNav'
import { MobileHeader } from '../navigation/MobileHeader'
import { Background3D } from '../three/Background3D'
import { BackgroundOrganic } from './BackgroundOrganic'
import { CommandPalette } from '../controls/CommandPalette'
import { ErrorBoundary } from '../feedback/ErrorBoundary'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { prefersReducedMotion } = useApp()
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const location = useLocation()
  const isLanding = location.pathname === '/'
  const isAuthPage = ['/login', '/signup'].includes(location.pathname)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
      {/* Global Interactions */}
      {!isAuthPage && <CommandPalette />}

      {/* Layer 2: Botanical illustrations */}
      {!isLanding && !isAuthPage && <BackgroundOrganic />}
      
      {/* Layer 3: Floating 3D objects — wrapped to catch WebGL context loss */}
      {!isLanding && !isAuthPage && (
        <ErrorBoundary fallback={<div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at 30% 50%, rgba(196,181,253,0.08), transparent)' }} />}> 
          <Background3D />
        </ErrorBoundary>
      )}

      {/* Layer 4 & 5: Glass dashboard & Content */}
      <div style={{ display: 'flex', width: '100%', position: 'relative', zIndex: 10 }}>
        {/* Sidebar — desktop only, except landing/auth */}
        {isDesktop && !isLanding && !isAuthPage && <Sidebar />}

      {/* Main area */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
      >
        {/* Top bar — desktop only, Mobile Header otherwise, except landing/auth */}
        {!isLanding && !isAuthPage && (isDesktop ? <TopBar /> : <MobileHeader />)}

        {/* Content — page transition via key + CSS animation */}
        <main
          id="main-content"
          role="main"
          key={location.pathname}
          className={prefersReducedMotion ? 'page-enter page-enter-static' : 'page-enter'}
          style={{
            flex: 1,
            paddingTop: isLanding || isAuthPage ? 0 : (isDesktop ? 64 : 56),
            paddingBottom: isLanding || isAuthPage ? 0 : (!isDesktop ? 64 : 0),
            background: 'transparent',
          }}
        >
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>

      {/* Mobile bottom nav, except landing/auth */}
      {!isDesktop && !isLanding && !isAuthPage && <MobileNav />}
      </div>
    </div>
  )
}
