// ============================================================
// App Layout Shell — Sidebar + TopBar + Main content
// Includes the 3D floating sphere from the reference design
// ============================================================

import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useLocation } from 'react-router-dom'
import { Sidebar } from '../navigation/Sidebar'
import { TopBar } from '../navigation/TopBar'
import { MobileNav } from '../navigation/MobileNav'
import { MobileHeader } from '../navigation/MobileHeader'
import { Background3D } from '../three/Background3D'
import { BackgroundOrganic } from './BackgroundOrganic'
import { CommandPalette } from '../controls/CommandPalette'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const location = useLocation()
  const isLanding = location.pathname === '/'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
      {/* Global Interactions */}
      <CommandPalette />

      {/* Layer 2: Botanical illustrations */}
      {!isLanding && <BackgroundOrganic />}
      
      {/* Layer 3: Floating 3D objects */}
      {!isLanding && <Background3D />}

      {/* Layer 4 & 5: Glass dashboard & Content */}
      <div style={{ display: 'flex', width: '100%', position: 'relative', zIndex: 10 }}>
        {/* Sidebar — desktop only, except landing */}
        {isDesktop && !isLanding && <Sidebar />}

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
        {/* Top bar — desktop only, Mobile Header otherwise, except landing */}
        {!isLanding && (isDesktop ? <TopBar /> : <MobileHeader />)}

        {/* Content */}
        <main
          id="main-content"
          role="main"
          style={{
            flex: 1,
            paddingTop: isLanding ? 0 : (isDesktop ? 64 : 56),
            paddingBottom: isLanding ? 0 : (!isDesktop ? 64 : 0),
            background: 'transparent',
          }}
        >
          {children}
        </main>
      </div>

      {/* Mobile bottom nav, except landing */}
      {!isDesktop && !isLanding && <MobileNav />}
      </div>
    </div>
  )
}
