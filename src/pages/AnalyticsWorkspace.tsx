// ============================================================
// Analytics Workspace Page
// ============================================================

import { useState, useEffect } from 'react'
import { PieChart, Star } from 'lucide-react'
import { analyticsService } from '@/services/mock/analyticsService'
import { useApp } from '@/hooks/useApp'
import type { AnalyticsSummary } from '@/types'
import { RatingDistributionChart } from '@/components/charts/RatingDistributionChart'
import { SourceDonutChart } from '@/components/charts/SourceDonutChart'
import volumeHeatmapImg from '@/assets/icons/analytics_heatmap.png'

export function AnalyticsWorkspace() {
  const { filters } = useApp()
  const [data, setData] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    analyticsService.getSummary(filters).then(res => {
      if (active && res.status === 'success') {
        setData(res.data)
        setLoading(false)
      }
    })
    return () => { active = false }
  }, [filters])

  const ratingData = data ? [
    { rating: 5, count: data.ratingDistribution[5] },
    { rating: 4, count: data.ratingDistribution[4] },
    { rating: 3, count: data.ratingDistribution[3] },
    { rating: 2, count: data.ratingDistribution[2] },
    { rating: 1, count: data.ratingDistribution[1] },
  ] : []

  const sourceData = data ? Object.entries(data.sourceBreakdown).map(([source, value], i) => {
    const colors = ['#A855F7', '#3B82F6', '#10B981', '#F59E0B', '#F43F5E']
    return { source, value, color: colors[i % colors.length] }
  }) : []

  return (
    <div className="page-section" style={{ paddingBottom: 80 }}>
      <header style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 30, fontWeight: 700, color: '#1C1033', letterSpacing: '-0.03em', marginBottom: 6 }}>
          Analytics Workspace
        </h1>
        <p style={{ fontSize: 15, color: '#4B4466' }}>
          Deep dive into sentiment trends, product comparisons, and rating distributions.
        </p>
      </header>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Rating Distribution */}
        <div className="glass-card" style={{ padding: '24px 32px', minHeight: 320, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(124,58,237,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Star size={16} style={{ color: '#A855F7' }} />
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1C1033', margin: 0 }}>Rating Distribution</h2>
          </div>
          
          <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            {loading ? (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 24, borderRadius: 6, width: `${100 - i * 15}%` }} />)}
              </div>
            ) : (
              <RatingDistributionChart data={ratingData} />
            )}
          </div>
        </div>

        {/* Source Breakdown */}
        <div className="glass-card" style={{ padding: '24px 32px', minHeight: 320, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(16,185,129,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PieChart size={16} style={{ color: '#10B981' }} />
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1C1033', margin: 0 }}>Source Breakdown</h2>
          </div>
          
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {loading ? (
              <div className="skeleton" style={{ width: 220, height: 220, borderRadius: '50%' }} />
            ) : (
              <SourceDonutChart data={sourceData} width={280} height={280} />
            )}
          </div>
        </div>
      </div>
      
      <div className="glass-card" style={{ padding: 24, minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <img src={volumeHeatmapImg} alt="Volume Heatmap" style={{ width: '100%', height: 'auto', objectFit: 'contain', borderRadius: 8 }} />
      </div>
    </div>
  )
}
