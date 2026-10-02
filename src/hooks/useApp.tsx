// ============================================================
// App Context — Filters, Settings, Performance Tier
// ============================================================

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from 'react'
import type { FilterState, AppSettings, PerformanceTier } from '@/types'

const defaultFilters: FilterState = {
  dateRange: 'last_30_days',
  productId: null,
  source: null,
}

function loadFilters(): FilterState {
  try {
    const raw = sessionStorage.getItem('rb-filters')
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<FilterState>
      return { ...defaultFilters, ...parsed }
    }
  } catch {
    // ignore
  }
  return defaultFilters
}

const defaultSettings: AppSettings = {
  performanceTier: 'auto',
  reducedMotion: false,
  theme: 'light',
  autoRefresh: false,
  refreshIntervalMs: 300000,
}

function detectPerformanceTier(): PerformanceTier {
  // Check WebGL support
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    if (!gl) return 'static'
  } catch {
    return 'static'
  }

  // Check device memory (if available)
  const nav = navigator as Navigator & { deviceMemory?: number }
  if (nav.deviceMemory !== undefined && nav.deviceMemory < 4) return 'lite'

  // Check hardware concurrency
  if (navigator.hardwareConcurrency <= 2) return 'lite'

  return 'full'
}

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem('rb-settings')
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppSettings>
      return { ...defaultSettings, ...parsed }
    }
  } catch {
    // ignore
  }
  return defaultSettings
}

// ── Context Types ─────────────────────────────────────────────
interface AppContextValue {
  filters: FilterState
  setFilters: (filters: FilterState) => void
  updateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void
  settings: AppSettings
  updateSettings: (patch: Partial<AppSettings>) => void
  performanceTier: PerformanceTier
  prefersReducedMotion: boolean
}

// eslint-disable-next-line react/only-export-components -- context file pattern: context, provider, and hook are co-located by design
export const AppContext = createContext<AppContextValue | null>(null)

// ── Provider ──────────────────────────────────────────────────
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFiltersState] = useState<FilterState>(loadFilters)
  const [settings, setSettings] = useState<AppSettings>(loadSettings)

  // Compute initial performance tier synchronously (avoids set-state-in-effect)
  const [performanceTier, setPerformanceTier] = useState<PerformanceTier>(() => {
    const stored = loadSettings()
    if (stored.performanceTier !== 'auto') return stored.performanceTier
    return detectPerformanceTier()
  })

  // Compute initial reduced-motion preference synchronously (avoids set-state-in-effect)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  )

  // Keep reduced motion in sync with OS preference changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const setFilters = useCallback((newFilters: FilterState) => {
    setFiltersState(newFilters)
    try { sessionStorage.setItem('rb-filters', JSON.stringify(newFilters)) } catch { /* ignore */ }
  }, [])

  const updateFilter = useCallback(<K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    setFiltersState(prev => {
      const next = { ...prev, [key]: value }
      try { sessionStorage.setItem('rb-filters', JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }, [])

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      try { localStorage.setItem('rb-settings', JSON.stringify(next)) } catch { /* ignore */ }
      if (patch.performanceTier && patch.performanceTier !== 'auto') {
        setPerformanceTier(patch.performanceTier)
      } else if (patch.performanceTier === 'auto') {
        setPerformanceTier(detectPerformanceTier())
      }
      return next
    })
  }, [])

  const value = useMemo<AppContextValue>(() => ({
    filters,
    setFilters,
    updateFilter,
    settings,
    updateSettings,
    performanceTier: settings.performanceTier === 'auto' ? performanceTier : settings.performanceTier,
    prefersReducedMotion: prefersReducedMotion || settings.reducedMotion,
  }), [filters, setFilters, settings, updateFilter, updateSettings, performanceTier, prefersReducedMotion])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
// ── Hook ──────────────────────────────────────────────────────
// eslint-disable-next-line react/only-export-components -- context file intentionally co-locates provider + hook
export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
