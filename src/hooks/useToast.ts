// ============================================================
// useToast hook — consume the Toast context
// ============================================================

import { useContext } from 'react'
import { ToastContext } from '@/components/feedback/toastContext'

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be inside ToastProvider')
  return ctx
}
