// ============================================================
// ReviewBand Mock Analytics Service
// Simulates 250–600ms latency deterministically.
// ============================================================

import type { Result, AnalyticsSummary, FilterState, KPICard } from '@/types'
import type { IAnalyticsService } from '@/services/contracts'
import {
  TOPICS,
  COMPLAINTS,
  INSIGHTS,
  SENTIMENT_TREND,
  MODEL_HEALTH_DATA,
  SPOTLIGHT_REVIEW,
  SPARKLINES,
  RATING_DISTRIBUTION,
  SOURCE_BREAKDOWN,
  PRODUCT_BREAKDOWN,
} from '@/data/mockData'

// Deterministic filter multipliers (not random)
function getFilterMultiplier(filters: FilterState): number {
  let m = 1.0
  if (filters.dateRange === 'last_7_days') m *= 0.22
  else if (filters.dateRange === 'last_30_days') m *= 1.0
  else if (filters.dateRange === 'last_90_days') m *= 2.84
  if (filters.productId !== null) m *= 0.31
  if (filters.source !== null) m *= 0.42
  return m
}

function makeDelta(pct: number, isPositiveGood: boolean): KPICard['delta'] {
  return {
    value: 0,
    pct,
    direction: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat',
    isPositive: isPositiveGood ? pct > 0 : pct < 0,
    comparisonLabel: 'vs previous 30 days',
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Deterministic latency based on filter hash
function getLatency(filters: FilterState): number {
  let hash = filters.dateRange.length + (filters.productId?.length ?? 0) + (filters.source?.length ?? 0)
  return 250 + (hash % 4) * 87  // 250–598ms
}

export class MockAnalyticsService implements IAnalyticsService {
  async getSummary(filters: FilterState): Promise<Result<AnalyticsSummary>> {
    await sleep(getLatency(filters))

    const m = getFilterMultiplier(filters)
    const totalReviews = Math.round(128430 * m)
    const avgRating = 4.21 - (m < 0.5 ? 0.12 : 0)
    const positivePct = 62.4 + (m < 0.3 ? -2.1 : 0)
    const neutralPct = 21.1 + (m < 0.3 ? 1.2 : 0)
    const negativePct = parseFloat((100 - positivePct - neutralPct).toFixed(1))
    const activeComplaints = Math.round(342 * Math.min(m, 1.0))

    const summary: AnalyticsSummary = {
      totalReviews: {
        id: 'total-reviews',
        label: 'Total Reviews',
        value: totalReviews,
        formattedValue: totalReviews.toLocaleString(),
        delta: makeDelta(8.2, true),
        sparkline: SPARKLINES.totalReviews,
      },
      averageRating: {
        id: 'avg-rating',
        label: 'Average Rating',
        value: avgRating,
        formattedValue: avgRating.toFixed(2),
        delta: makeDelta(6.8, true),
        sparkline: SPARKLINES.avgRating,
        unit: '/ 5',
      },
      positiveSentiment: {
        id: 'positive-sentiment',
        label: 'Positive Sentiment',
        value: positivePct,
        formattedValue: `${positivePct}%`,
        delta: makeDelta(8.1, true),
        sparkline: SPARKLINES.positiveSentiment,
      },
      neutralSentiment: {
        id: 'neutral-sentiment',
        label: 'Neutral Sentiment',
        value: neutralPct,
        formattedValue: `${neutralPct}%`,
        delta: makeDelta(2.3, false),
        sparkline: SPARKLINES.neutralSentiment,
      },
      negativeSentiment: {
        id: 'negative-sentiment',
        label: 'Negative Sentiment',
        value: negativePct,
        formattedValue: `${negativePct}%`,
        delta: makeDelta(-5.8, false),
        sparkline: SPARKLINES.negativeSentiment,
      },
      activeComplaints: {
        id: 'active-complaints',
        label: 'Active Complaints',
        value: activeComplaints,
        formattedValue: activeComplaints.toLocaleString(),
        delta: makeDelta(18.4, false),
        sparkline: SPARKLINES.activeComplaints,
      },
      sentiment: {
        positive: positivePct,
        neutral: neutralPct,
        negative: negativePct,
        totalReviews,
        trend: SENTIMENT_TREND,
      },
      topics: TOPICS.map(t => ({
        ...t,
        mentions: Math.round(t.mentions * m),
      })),
      complaints: COMPLAINTS.map(c => ({
        ...c,
        activeCount: Math.round(c.activeCount * Math.min(m, 1.0)),
      })),
      recentInsights: INSIGHTS.slice(0, 6),
      spotlightReview: SPOTLIGHT_REVIEW,
      modelHealth: MODEL_HEALTH_DATA,
      ratingDistribution: Object.fromEntries(
        Object.entries(RATING_DISTRIBUTION).map(([k, v]) => [k, Math.round(v * m)])
      ) as Record<1 | 2 | 3 | 4 | 5, number>,
      sourceBreakdown: Object.fromEntries(
        Object.entries(SOURCE_BREAKDOWN).map(([k, v]) => [k, Math.round(v * m)])
      ) as typeof SOURCE_BREAKDOWN,
      productBreakdown: Object.fromEntries(
        Object.entries(PRODUCT_BREAKDOWN).map(([k, v]) => [k, Math.round(v * m)])
      ),
    }

    return { status: 'success', data: summary }
  }
}

export const analyticsService = new MockAnalyticsService()
