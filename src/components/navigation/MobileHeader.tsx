// ============================================================
// Mobile Header
// ============================================================

import { useState } from 'react'
import { Bell, Search } from 'lucide-react'
import { ReviewBandLogo } from './Logo'
import { NotificationPanel } from '../controls/NotificationPanel'

export function MobileHeader() {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 56,
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(221,228,238,0.8)',
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <ReviewBandLogo variant="full" size={24} />
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
          style={{
            background: 'none',
            border: 'none',
            color: '#4B4466',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
          }}
          aria-label="Search"
        >
          <Search size={20} />
        </button>
        
        <button
          onClick={() => setIsNotificationsOpen(true)}
          style={{
            position: 'relative',
            background: 'none',
            border: 'none',
            color: '#4B4466',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
          }}
          aria-label="Notifications"
        >
          <Bell size={20} />
          {/* Notification dot */}
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#A855F7',
              border: '1.5px solid white',
            }}
          />
        </button>
        
        <NotificationPanel isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
      </div>
    </header>
  )
}
