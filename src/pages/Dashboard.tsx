// ============================================================
// Dashboard Page — Reference-faithful purple glassmorphism
// ============================================================

import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import {
  MessageSquare, Star, Smile, Meh, Frown, AlertTriangle,
  Activity, Sparkles, ChevronRight, TrendingUp, ArrowUpRight,
} from 'lucide-react'

import { useApp } from '@/hooks/useApp'
import { useAnalytics } from '@/hooks/useAnalytics'
import { KPICardComponent, KPICardSkeleton } from '@/components/cards/KPICard'
import { SentimentTrendChart } from '@/components/charts/SentimentTrendChart'
import { SentimentDistributionChart } from '@/components/charts/SentimentDistributionChart'
import { TopTopicsChart } from '@/components/charts/TopTopicsChart'
import { RecentInsights } from '@/components/dashboard/RecentInsights'
import { ReviewSpotlight } from '@/components/dashboard/ReviewSpotlight'

gsap.registerPlugin(useGSAP)

/* ── Shared glass card wrapper ─────────────────────────────── */
function GCard({
  children,
  className = '',
  style = {},
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      className={`glass-card ${className}`}
      style={{
        padding: 24,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/* ── Section heading row ───────────────────────────────────── */
function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  action,
  iconColor = '#7C3AED',
}: {
  icon: any
  title: string
  subtitle?: string
  action?: React.ReactNode
  iconColor?: string
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: `rgba(${iconColor === '#7C3AED' ? '124,58,237' : '16,185,129'},0.12)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: iconColor,
            }}
          >
            <Icon size={14} strokeWidth={2} />
          </div>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: '#1C1033' }}>{title}</h2>
        </div>
        {subtitle && (
          <p style={{ fontSize: 12, color: '#8B83A3', paddingLeft: 36 }}>{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  )
}

/* ── Empty state ───────────────────────────────────────────── */
function EmptyState() {
  return (
    <div
      style={{
        gridColumn: '1 / -1',
        padding: '60px 40px',
        textAlign: 'center',
        background: 'rgba(255,255,255,0.75)',
        borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.90)',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: 'rgba(124,58,237,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
        }}
      >
        <Activity size={24} style={{ color: '#A855F7' }} />
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1C1033', marginBottom: 8 }}>No data found</h3>
      <p style={{ fontSize: 14, color: '#8B83A3' }}>Try adjusting your filters to see results.</p>
    </div>
  )
}

/* ── Main Dashboard ────────────────────────────────────────── */
export function Dashboard() {
  const { filters, prefersReducedMotion } = useApp()
  const analytics = useAnalytics(filters)
  const status = analytics.status
  const data = status === 'success' ? analytics.data : null
  const containerRef = useRef<HTMLDivElement>(null)

  const isLoading = status === 'loading'
  const isEmpty   = status === 'empty' || (status === 'success' && !data)

  useGSAP(() => {
    if (prefersReducedMotion) {
      gsap.set('.kpi-card, .main-chart, .secondary-widget', {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
      })
      return
    }
    if (isLoading || !data) return

    const tl = gsap.timeline()

    tl.from('.kpi-card', {
      y: 24, opacity: 0, duration: 0.45,
      stagger: 0.06, ease: 'power2.out', clearProps: 'all',
    })
    tl.from('.main-chart', {
      y: 24, opacity: 0, duration: 0.55,
      stagger: 0.10, ease: 'power2.out', clearProps: 'all',
    }, '-=0.2')
    tl.from('.secondary-widget', {
      y: 24, opacity: 0, duration: 0.50,
      stagger: 0.06, ease: 'power2.out', clearProps: 'all',
    }, '-=0.3')
  }, { dependencies: [isLoading, data, prefersReducedMotion], scope: containerRef })

  return (
    <div className="page-section" style={{ paddingBottom: 80 }} ref={containerRef}>

      {/* ── HEADER ─────────────────────────────────────────── */}
      <header
        style={{
          marginBottom: 28,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 20,
        }}
      >
        {/* Left: greeting */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#8B83A3', textTransform: 'uppercase', marginBottom: 6 }}>
            AI ↑
          </p>
          <h1 style={{ fontSize: 30, fontWeight: 700, color: '#1C1033', letterSpacing: '-0.03em', marginBottom: 6 }}>
            Good Morning,{' '}
            <span className="text-gradient-purple">Anshu</span>
          </h1>
          <p style={{ fontSize: 15, color: '#4B4466', marginBottom: 14 }}>
            Turn customer voices into actionable business insights.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {/* AI Engine badge */}
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 12px',
                borderRadius: 999,
                background: 'rgba(16,185,129,0.10)',
                border: '1px solid rgba(16,185,129,0.20)',
                fontSize: 11, fontWeight: 700, color: '#059669',
                letterSpacing: '0.04em',
              }}
            >
              <span
                style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#10B981',
                  boxShadow: '0 0 6px #10B981',
                }}
              />
              AI ENGINE ONLINE
            </span>
            {/* Data freshness */}
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 12px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.70)',
                border: '1px solid rgba(196,181,253,0.25)',
                fontSize: 11, fontWeight: 500, color: '#8B83A3',
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#F87171' }} />
              Data updated 2 min ago
            </span>
          </div>
        </div>

        {/* Right: AI Insight card — matches reference */}
        <div
          className="glass-card"
          style={{
            padding: '16px 20px',
            maxWidth: 340,
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(196,181,253,0.40), rgba(124,58,237,0.20))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              border: '1px solid rgba(196,181,253,0.35)',
            }}
          >
            <Sparkles size={17} strokeWidth={1.75} style={{ color: '#7C3AED' }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', marginBottom: 4, letterSpacing: '0.04em' }}>
              AI INSIGHT
            </p>
            <p style={{ fontSize: 13, fontWeight: 500, color: '#1C1033', lineHeight: 1.5 }}>
              "Customers love the product quality, but delivery complaints increased by 18% this month."
            </p>
          </div>
          <button
            style={{
              alignSelf: 'center',
              width: 28, height: 28, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(124,58,237,0.10)',
              border: '1px solid rgba(196,181,253,0.40)',
              cursor: 'pointer',
              color: '#7C3AED',
              flexShrink: 0,
            }}
          >
            <ChevronRight size={14} strokeWidth={2.5} />
          </button>
        </div>
      </header>

      {/* ── KPI ROW ────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {isLoading || !data ? (
          <>
            <KPICardSkeleton /><KPICardSkeleton /><KPICardSkeleton />
            <KPICardSkeleton /><KPICardSkeleton /><KPICardSkeleton />
          </>
        ) : isEmpty ? (
          <EmptyState />
        ) : (
          <>
            <div className="kpi-card"><KPICardComponent kpi={data.totalReviews}      color="#7C3AED" icon={MessageSquare} /></div>
            <div className="kpi-card"><KPICardComponent kpi={data.averageRating}     color="#10B981" icon={Star} /></div>
            <div className="kpi-card"><KPICardComponent kpi={data.activeComplaints}  color="#F87171" icon={AlertTriangle} /></div>
            <div className="kpi-card"><KPICardComponent kpi={data.positiveSentiment} color="#10B981" icon={Smile} /></div>
            <div className="kpi-card"><KPICardComponent kpi={data.neutralSentiment}  color="#C4B5FD" icon={Meh} /></div>
            <div className="kpi-card"><KPICardComponent kpi={data.negativeSentiment} color="#F87171" icon={Frown} /></div>
          </>
        )}
      </div>

      {!isEmpty && (
        <>
          {/* ── CHARTS ROW ───────────────────────────────────── */}
          <div className="dashboard-grid-charts">
            {/* Sentiment Trend */}
            <GCard className="main-chart">
              <SectionHeader
                icon={TrendingUp}
                title="Customer Sentiment Trend"
                subtitle="How customer sentiment has changed over time"
                action={
                  <div
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '5px 12px',
                      borderRadius: 999,
                      background: 'rgba(255,255,255,0.80)',
                      border: '1px solid rgba(196,181,253,0.30)',
                      fontSize: 12, color: '#4B4466', cursor: 'pointer',
                    }}
                  >
                    Last 30 Days
                    <ChevronDown size={12} strokeWidth={2} style={{ color: '#8B83A3' }} />
                  </div>
                }
              />
              <div style={{ height: 260 }}>
                {isLoading || !data ? (
                  <div className="skeleton" style={{ width: '100%', height: '100%', borderRadius: 12 }} />
                ) : (
                  <SentimentTrendChart data={data.sentiment.trend} height={260} />
                )}
              </div>
              {/* Legend row */}
              {data && (
                <div style={{ display: 'flex', gap: 20, marginTop: 14 }}>
                  {[
                    { label: 'Positive', color: '#10B981' },
                    { label: 'Neutral',  color: '#C4B5FD' },
                    { label: 'Negative', color: '#F87171' },
                  ].map(l => (
                    <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 10, height: 3, borderRadius: 2, background: l.color }} />
                      <span style={{ fontSize: 12, color: '#8B83A3' }}>{l.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </GCard>

            {/* Top Customer Topics */}
            <GCard className="main-chart secondary-widget">
              <SectionHeader
                icon={MessageSquare}
                title="Top Customer Topics"
                subtitle="Most discussed topics in reviews"
                action={
                  <button
                    style={{
                      fontSize: 12, fontWeight: 600, color: '#7C3AED',
                      background: 'none', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 3,
                    }}
                  >
                    See All <ArrowUpRight size={12} strokeWidth={2} />
                  </button>
                }
              />
              {isLoading || !data ? (
                <div className="skeleton" style={{ height: 220, borderRadius: 12 }} />
              ) : (
                <TopTopicsChart topics={data.topics} totalReviews={data.totalReviews.value} />
              )}
            </GCard>
          </div>

          {/* ── BOTTOM ROW ───────────────────────────────────── */}
          <div className="dashboard-grid-bottom">
            {/* Sentiment Distribution */}
            <GCard className="secondary-widget">
              <SectionHeader
                icon={Activity}
                title="Sentiment Distribution"
                subtitle=""
                action={
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8B83A3', fontSize: 18, lineHeight: 1 }}>
                    ···
                  </button>
                }
              />
              {isLoading || !data ? (
                <div className="skeleton" style={{ height: 180, borderRadius: 12 }} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <SentimentDistributionChart
                    positive={data.sentiment.positive}
                    neutral={data.sentiment.neutral}
                    negative={data.sentiment.negative}
                    total={data.sentiment.totalReviews}
                    size={160}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { label: 'Positive', pct: data.sentiment.positive, color: '#10B981' },
                      { label: 'Neutral',  pct: data.sentiment.neutral,  color: '#C4B5FD' },
                      { label: 'Negative', pct: data.sentiment.negative, color: '#F87171' },
                    ].map(r => (
                      <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: '#4B4466', width: 55 }}>{r.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#1C1033', fontVariantNumeric: 'tabular-nums' }}>
                          {r.pct.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </GCard>

            {/* Recent AI Insights */}
            <GCard className="secondary-widget">
              <SectionHeader
                icon={Sparkles}
                title="Recent AI Insights"
                action={
                  <button
                    style={{
                      fontSize: 12, fontWeight: 600, color: '#7C3AED',
                      background: 'none', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 3,
                    }}
                  >
                    View All <ArrowUpRight size={12} strokeWidth={2} />
                  </button>
                }
              />
              {isLoading || !data ? (
                <div className="skeleton" style={{ height: 180, borderRadius: 12 }} />
              ) : (
                <RecentInsights insights={data.recentInsights} />
              )}
            </GCard>

            {/* Review Spotlight */}
            <GCard className="secondary-widget">
              <SectionHeader
                icon={MessageSquare}
                title="Review Spotlight"
                action={
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8B83A3', fontSize: 18, lineHeight: 1 }}>
                    ···
                  </button>
                }
              />
              {isLoading || !data ? (
                <div className="skeleton" style={{ height: 140, borderRadius: 12 }} />
              ) : (
                <ReviewSpotlight review={data.spotlightReview} />
              )}
            </GCard>

          </div>
        </>
      )}

      {isEmpty && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
          <EmptyState />
        </div>
      )}
    </div>
  )
}

// Needed for the dropdown chevron in the chart header
function ChevronDown(props: { size: number; strokeWidth: number; style?: React.CSSProperties }) {
  return (
    <svg
      width={props.size}
      height={props.size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={props.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={props.style}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}
