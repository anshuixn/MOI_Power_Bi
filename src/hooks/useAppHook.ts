// ============================================================
// useApp — consume the App context
// ============================================================

import { useContext } from 'react'
import { AppContext } from '@/hooks/useApp'

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
