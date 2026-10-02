// ============================================================
// Notification Panel — Alerts, Insights, Info
// ============================================================

import { useState } from 'react'
import { X, Check, Bell, AlertTriangle, Lightbulb, Info } from 'lucide-react'

export type NotificationType = 'alert' | 'insight' | 'info'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  time: string
  read: boolean
}

const MOCK_NOTIFICATIONS: AppNotification[] = [
  { id: 'n-1', type: 'alert', title: 'Sentiment Anomaly', message: 'Delivery-related negative reviews rose 18% over the last 14 days.', time: '10m ago', read: false },
  { id: 'n-2', type: 'alert', title: 'New Complaint Cluster', message: 'Mentions of battery life doubled this week for Nimbus Earbuds.', time: '1h ago', read: false },
  { id: 'n-3', type: 'insight', title: 'Topic Trend Shift', message: 'Feature satisfaction is at its highest point in 6 months.', time: '3h ago', read: false },
  { id: 'n-4', type: 'info', title: 'Model Drift Warning', message: 'Topic model drift approaching 5% threshold.', time: '1d ago', read: true },
  { id: 'n-5', type: 'insight', title: 'Opportunity Detected', message: 'Customers mentioning fast support rate products 0.6 stars higher.', time: '2d ago', read: true },
]

export function NotificationPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS)

  const unreadCount = notifications.filter(n => !n.read).length

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }
  
  const toggleRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: !n.read } : n))
  }

  if (!isOpen) return null

  return (
    <>
      <div 
        style={{ position: 'fixed', inset: 0, zIndex: 9998 }} 
        onClick={onClose} 
        aria-hidden="true" 
      />
      <div
        style={{
          position: 'fixed',
          top: 72, // Below topbar
          right: 24,
          width: 380,
          maxHeight: 'calc(100vh - 96px)',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(255, 255, 255, 0.75)',
          backdropFilter: 'blur(30px) saturate(140%)',
          WebkitBackdropFilter: 'blur(30px) saturate(140%)',
          border: '1px solid rgba(255, 255, 255, 0.85)',
          borderRadius: 16,
          boxShadow: '0 24px 48px rgba(27, 31, 42, 0.1), 0 0 0 1px rgba(109, 61, 245, 0.05)',
          zIndex: 9999,
          animation: 'slide-left 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: '#1B1F2A' }}>Notifications</span>
            {unreadCount > 0 && (
              <span style={{ background: '#6D3DF5', color: '#fff', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 12 }}>
                {unreadCount} new
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {unreadCount > 0 && (
              <button 
                onClick={markAllRead}
                style={{ background: 'none', border: 'none', fontSize: 12, color: '#6D3DF5', cursor: 'pointer', fontWeight: 500 }}
              >
                Mark all read
              </button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
          {notifications.length > 0 ? (
            notifications.map(n => {
              const Icon = n.type === 'alert' ? AlertTriangle : n.type === 'insight' ? Lightbulb : Info
              const accent = n.type === 'alert' ? '#EA6670' : n.type === 'insight' ? '#7C4DFF' : '#4C8BD4'
              
              return (
                <div 
                  key={n.id} 
                  style={{ 
                    position: 'relative',
                    padding: '16px 20px', 
                    display: 'flex', 
                    gap: 16,
                    background: n.read ? 'transparent' : 'rgba(109, 61, 245, 0.03)',
                    borderBottom: '1px solid rgba(0,0,0,0.03)',
                    transition: 'background 0.2s ease'
                  }}
                >
                  {!n.read && (
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: '#6D3DF5' }} />
                  )}
                  
                  <div style={{ 
                    width: 36, height: 36, borderRadius: '50%', background: `${accent}15`, 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 
                  }}>
                    <Icon size={18} color={accent} />
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: n.read ? 500 : 600, color: '#1B1F2A' }}>{n.title}</span>
                      <span style={{ fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap' }}>{n.time}</span>
                    </div>
                    <p style={{ fontSize: 13, color: '#4A5160', margin: 0, lineHeight: 1.4 }}>{n.message}</p>
                    
                    <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                       <button onClick={() => toggleRead(n.id)} style={{ background: 'none', border: 'none', fontSize: 12, color: '#6B7280', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Check size={14} /> {n.read ? 'Mark unread' : 'Mark read'}
                       </button>
                       <button onClick={() => dismissNotification(n.id)} style={{ background: 'none', border: 'none', fontSize: 12, color: '#6B7280', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <X size={14} /> Dismiss
                       </button>
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Bell size={24} color="#9CA3AF" />
              </div>
              <span style={{ fontSize: 14, color: '#4A5160', fontWeight: 500 }}>All caught up!</span>
              <p style={{ fontSize: 13, color: '#9CA3AF', margin: '4px 0 0' }}>You have no new notifications.</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
