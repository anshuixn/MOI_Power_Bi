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
  BASELINE_AVERAGE_RATING,
  BASELINE_SENTIMENT,
  BASELINE_TOTAL_REVIEWS,
} from '@/data/mockData'

// Deterministic filter multipliers (not random)
function getFilterMultiplier(filters: FilterState): number {
  let m = 1.0
  if (filters.dateRange === 'last_7_days') m *= 0.22
  else if (filters.dateRange === 'last_30_days') m *= 1.0
  else if (filters.dateRange === 'last_90_days') m *= 2.84
  else if (
    filters.dateRange === 'custom' &&
    filters.customDateStart &&
    filters.customDateEnd
  ) {
    const start = Date.parse(filters.customDateStart)
    const end = Date.parse(filters.customDateEnd)
    if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
      const days = Math.floor((end - start) / 86_400_000) + 1
      m *= days / 30
    }
  }
  if (filters.productId !== null) m *= 0.31
  if (filters.source !== null) m *= 0.42
  return m
}

function scaleCountsToTotal<T extends Record<string, number>>(
  counts: T,
  targetTotal: number,
): T {
  const sourceTotal = Object.values(counts).reduce((sum, value) => sum + value, 0)
  const entries: [string, number][] = Object.entries(counts).map(([key, count]) => [
    key,
    Math.round((count / sourceTotal) * targetTotal),
  ])
  const currentTotal = entries.reduce((sum, [, count]) => sum + count, 0)
  const largestEntry = entries.reduce((largest, entry) =>
    entry[1] > largest[1] ? entry : largest
  )
  largestEntry[1] += targetTotal - currentTotal
  return Object.fromEntries(entries) as T
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
    const totalReviews = Math.round(BASELINE_TOTAL_REVIEWS * m)
    const avgRating = BASELINE_AVERAGE_RATING
    const positivePct = BASELINE_SENTIMENT.positive
    const neutralPct = BASELINE_SENTIMENT.neutral
    const negativePct = parseFloat((100 - positivePct - neutralPct).toFixed(1))
    const complaints = COMPLAINTS.map(complaint => ({
      ...complaint,
      activeCount: Math.round(complaint.activeCount * Math.min(m, 1.0)),
    }))
    const activeComplaints = complaints.reduce(
      (sum, complaint) => sum + complaint.activeCount,
      0,
    )

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
      complaints,
      recentInsights: INSIGHTS.slice(0, 6),
      spotlightReview: SPOTLIGHT_REVIEW,
      modelHealth: MODEL_HEALTH_DATA,
      ratingDistribution: scaleCountsToTotal(RATING_DISTRIBUTION, totalReviews) as Record<1 | 2 | 3 | 4 | 5, number>,
      sourceBreakdown: scaleCountsToTotal(SOURCE_BREAKDOWN, totalReviews),
      productBreakdown: scaleCountsToTotal(PRODUCT_BREAKDOWN, totalReviews),
    }

    return { status: 'success', data: summary }
  }
}

export const analyticsService = new MockAnalyticsService()
