// ============================================================
// Recent AI Insights — Purple glassmorphism reference design
// ============================================================

import { useMemo } from 'react'
import { TrendingUp, AlertTriangle, Lightbulb, ChevronRight } from 'lucide-react'
import type { Insight } from '@/types'

interface RecentInsightsProps {
  insights: Insight[]
}

export function RecentInsights({ insights }: RecentInsightsProps) {
  const display = insights.slice(0, 2)
  // eslint-disable-next-line -- Date.now() is a snapshot, intentionally run once
  const now = useMemo(() => Date.now(), [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {display.map(insight => {
        const isAlert = insight.kind === 'alert'
        const isTrend = insight.kind === 'trend_detected'

        let Icon  = Lightbulb
        let color = '#7C3AED'
        let bg    = 'rgba(196,181,253,0.18)'

        if (isAlert || isTrend) {
          Icon  = isAlert ? AlertTriangle : TrendingUp
          color = '#F87171'
          bg    = 'rgba(248,113,113,0.12)'
        }

        // Time ago string
        const minsAgo = Math.round((now - new Date(insight.generatedAt).getTime()) / 60000)
        const timeLabel = minsAgo < 60
          ? `${minsAgo} min ago`
          : `${Math.round(minsAgo / 60)} hours ago`

        return (
          <div
            key={insight.id}
            className="glass"
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
              padding: '12px',
              transition: 'background 0.15s ease',
            }}
          >
            {/* Icon chip */}
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color,
                flexShrink: 0,
              }}
            >
              <Icon size={14} strokeWidth={2} />
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#1C1033',
                  lineHeight: 1.4,
                  marginBottom: 4,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical' as const,
                  overflow: 'hidden',
                }}
              >
                {insight.summary}
              </p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                <span style={{ fontSize: 11, color: '#8B83A3' }}>
                  Topic: {isAlert ? 'Urgent' : 'General'}
                </span>
                <span style={{ fontSize: 11, color: '#8B83A3' }}>·</span>
                <span style={{ fontSize: 11, color: '#8B83A3' }}>
                  Product: Agha
                </span>
              </div>
            </div>

            {/* Time + arrow */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 11, color: '#8B83A3', whiteSpace: 'nowrap' }}>
                {timeLabel}
              </span>
              <button
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(124,58,237,0.08)',
                  border: '1px solid rgba(196,181,253,0.30)',
                  cursor: 'pointer',
                  color: '#7C3AED',
                }}
              >
                <ChevronRight size={13} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
