// ============================================================
// useAnalytics — fetches summary data from the analytics service
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import type { AnalyticsSummary, FilterState } from '@/types'
import { analyticsService } from '@/services/mock/analyticsService'

type State =
  | { status: 'loading' }
  | { status: 'success'; data: AnalyticsSummary }
  | { status: 'error'; error: string }
  | { status: 'empty' }

export function useAnalytics(filters: FilterState) {
  const [state, setState] = useState<State>({ status: 'loading' })

  const load = useCallback(async () => {
    setState({ status: 'loading' })
    const result = await analyticsService.getSummary(filters)
    if (result.status === 'success') {
      if (!result.data) {
        setState({ status: 'empty' })
      } else {
        setState({ status: 'success', data: result.data })
      }
    } else if (result.status === 'error') {
      setState({ status: 'error', error: result.error })
    }
  }, [filters])

  // oxlint-disable-next-line react/set-state-in-effect -- async data fetching: setState called after await, not synchronously
  useEffect(() => {
    void load()
  }, [load])

  return { ...state, reload: load }
}
