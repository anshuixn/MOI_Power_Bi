// ============================================================
// Global Toast Notification System
// Bottom-right, auto-dismiss, progress bar
// ============================================================

import React, { useCallback, useState, useRef, useEffect } from 'react'
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react'
import { ToastContext } from './toastContext'
import type { Toast } from './toastContext'

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const duration = toast.duration ?? 4000
  const [progress, setProgress] = useState(100)
  const startRef = useRef<number>(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    startRef.current = Date.now()
    const tick = () => {
      const elapsed = Date.now() - startRef.current
      const pct = Math.max(0, 100 - (elapsed / duration) * 100)
      if (pct > 0) {
        setProgress(pct)
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setProgress(0)
        onDismiss()
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [duration, onDismiss])

  const Icon = toast.type === 'success' ? CheckCircle2 : toast.type === 'error' ? AlertCircle : Info
  const accent =
    toast.type === 'success' ? '#2E9E73' :
    toast.type === 'error'   ? '#EA6670' : '#7C4DFF'

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '12px 14px',
        borderRadius: 14,
        background: 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(24px) saturate(140%)',
        WebkitBackdropFilter: 'blur(24px) saturate(140%)',
        border: '1px solid rgba(255,255,255,0.85)',
        boxShadow: '0 8px 32px rgba(109,61,245,0.12), 0 2px 8px rgba(0,0,0,0.06)',
        minWidth: 260,
        maxWidth: 340,
        animation: 'toast-in 0.28s cubic-bezier(0.34,1.56,0.64,1)',
      }}
    >
      <Icon size={16} style={{ color: accent, flexShrink: 0, marginTop: 1 }} strokeWidth={2} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1B1F2A', lineHeight: 1.3 }}>
          {toast.title}
        </div>
        {toast.message && (
          <div style={{ fontSize: 12, color: '#4A5160', marginTop: 2, lineHeight: 1.4 }}>
            {toast.message}
          </div>
        )}
      </div>
      <button
        onClick={onDismiss}
        aria-label="Dismiss notification"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#9CA3AF', padding: 2, flexShrink: 0,
        }}
      >
        <X size={13} strokeWidth={2} />
      </button>

      {/* Progress bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0, left: 0,
          height: 2,
          width: `${progress}%`,
          background: accent,
          transition: 'width 0.1s linear',
          borderRadius: '0 0 0 14px',
        }}
      />
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((opts: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setToasts(prev => [...prev, { ...opts, id }])
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      {/* Toast container */}
      <div
        aria-label="Notifications"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          pointerEvents: 'none',
        }}
      >
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <ToastItem toast={t} onDismiss={() => dismiss(t.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
