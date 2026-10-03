// ============================================================
// AI Insights Page
// ============================================================

import { useState, useEffect } from 'react'
import { Sparkles, AlertTriangle, TrendingUp, Lightbulb, Zap, ArrowRight, RefreshCcw } from 'lucide-react'
import { analyticsService } from '@/services/mock/analyticsService'
import { useApp } from '@/hooks/useApp'
import type { AnalyticsSummary } from '@/types'

export function AiInsights() {
  const { filters, prefersReducedMotion } = useApp()
  const [data, setData] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)

  const fetchInsights = () => {
    let active = true
    analyticsService.getSummary(filters).then(res => {
      if (active && res.status === 'success') {
        setData(res.data)
        setLoading(false)
        setRegenerating(false)
      }
    })
    return () => { active = false }
  }

  useEffect(() => {
    setLoading(true)
    return fetchInsights()
  }, [filters])

  const handleRegenerate = () => {
    setRegenerating(true)
    fetchInsights()
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'alert': return <AlertTriangle size={20} style={{ color: '#F59E0B' }} />
      case 'trend': return <TrendingUp size={20} style={{ color: '#3B82F6' }} />
      case 'opportunity': return <Lightbulb size={20} style={{ color: '#10B981' }} />
      case 'anomaly': return <Zap size={20} style={{ color: '#F43F5E' }} />
      default: return <Sparkles size={20} style={{ color: '#A855F7' }} />
    }
  }

  return (
    <div className="page-section" style={{ paddingBottom: 80 }}>
      <header style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 700, color: '#1C1033', letterSpacing: '-0.03em', marginBottom: 6 }}>
            AI Insights
          </h1>
          <p style={{ fontSize: 15, color: '#4B4466' }}>
            Magazine-style feed of automated intelligence, trends, and anomalies.
          </p>
        </div>
        
        <button 
          className="glass-interactive interactive"
          onClick={handleRegenerate}
          disabled={loading || regenerating}
          style={{ 
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', 
            borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)',
            cursor: loading || regenerating ? 'not-allowed' : 'pointer',
            opacity: loading || regenerating ? 0.6 : 1
          }}
        >
          <RefreshCcw size={16} className={regenerating ? 'spin' : ''} style={{ color: '#A855F7' }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: '#4B4466' }}>Regenerate</span>
        </button>
      </header>
      
      {loading && !regenerating ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="glass-card skeleton" style={{ height: 280 }} />
          ))}
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
          gap: 24,
          opacity: regenerating ? 0.5 : 1,
          transition: 'opacity 0.3s ease'
        }}>
          {data?.recentInsights.map((insight, idx) => (
            <div 
              key={insight.id} 
              className="glass-card interactive"
              style={{ 
                padding: 24, 
                display: 'flex', 
                flexDirection: 'column',
                animation: prefersReducedMotion ? 'none' : `slideUpFadeIn 0.4s ease both ${idx * 0.05}s`,
                opacity: prefersReducedMotion ? 1 : undefined,
                transform: prefersReducedMotion ? 'none' : undefined
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ 
                  width: 40, height: 40, borderRadius: 12, 
                  background: 'rgba(255,255,255,0.5)', 
                  border: '1px solid rgba(0,0,0,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' 
                }}>
                  {getIcon(insight.kind)}
                </div>
                <div style={{ 
                  padding: '4px 10px', 
                  borderRadius: 12, 
                  background: 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(0,0,0,0.05)',
                  fontSize: 12, fontWeight: 600, color: '#4B4466'
                }}>
                  {(insight.confidence * 100).toFixed(0)}% Confidence
                </div>
              </div>
              
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1C1033', margin: '0 0 12px 0', lineHeight: 1.3 }}>
                {insight.title}
              </h3>
              
              <p style={{ fontSize: 14, color: '#4B4466', lineHeight: 1.6, flex: 1, margin: 0 }}>
                {insight.summary}
              </p>
              
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 6, color: '#7C3AED', cursor: 'pointer', fontWeight: 500, fontSize: 13 }}>
                View source reviews <ArrowRight size={14} />
              </div>
            </div>
          ))}
        </div>
      )}
      
      <style>{`
        @keyframes slideUpFadeIn {
          to { opacity: 1; transform: translateY(0); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
