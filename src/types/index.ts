// ============================================================
// ReviewBand Domain Types
// Designed for future FastAPI + NLP + Supabase compatibility
// ============================================================

// ── Result Type ──────────────────────────────────────────────
export type Result<T> =
  | { status: 'success'; data: T }
  | { status: 'error'; error: string; code?: number }
  | { status: 'loading' }
  | { status: 'empty' }

// ── Enumerations ─────────────────────────────────────────────
export type SentimentLabel = 'positive' | 'neutral' | 'negative'
export type ReviewSource = 'web_store' | 'mobile_app' | 'marketplace' | 'survey' | 'social'
export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical'
export type ComponentStatus = 'online' | 'degraded' | 'offline' | 'maintenance'
export type InsightKind = 'trend_detected' | 'opportunity' | 'alert' | 'anomaly' | 'summary'
export type InsightImpact = 'low' | 'medium' | 'high' | 'critical'
export type PerformanceTier = 'full' | 'lite' | 'static' | 'auto'
export type DateRange = 'last_7_days' | 'last_30_days' | 'last_90_days' | 'custom'

// ── Filter State ─────────────────────────────────────────────
export interface FilterState {
  dateRange: DateRange
  customDateStart?: string
  customDateEnd?: string
  productId: string | null   // null = "All Products"
  source: ReviewSource | null // null = "All Sources"
  sentiment?: SentimentLabel | null
  topicId?: string | null
  complaintId?: string | null
}

// ── PII Status ───────────────────────────────────────────────
export interface PIIStatus {
  isClean: boolean
  redactedFields: string[]
  detectedEntities: string[]
  processedAt: string
}

// ── Sentiment ────────────────────────────────────────────────
export interface SentimentScore {
  label: SentimentLabel
  positive: number   // 0–1
  neutral: number    // 0–1
  negative: number   // 0–1
  confidence: number // 0–1
}

export interface SentimentDataPoint {
  date: string       // ISO date string
  positive: number   // percentage 0–100
  neutral: number
  negative: number
  reviewCount: number
}

export interface SentimentSummary {
  positive: number   // percentage
  neutral: number
  negative: number
  totalReviews: number
  trend: SentimentDataPoint[]
}

// ── Product ──────────────────────────────────────────────────
export interface Product {
  id: string
  name: string
  sku: string
  category: string
  imageUrl?: string
}

// ── Topic ────────────────────────────────────────────────────
export interface Topic {
  id: string
  name: string
  mentions: number
  positivePct: number
  neutralPct: number
  negativePct: number
  keywords: string[]
  trend: 'rising' | 'stable' | 'falling'
  trendPct: number   // delta %
  sampleReviewIds: string[]
}

// ── Review ───────────────────────────────────────────────────
export interface Review {
  id: string
  text: string
  rating: number         // 1–5
  productId: string | null
  productName: string
  source: ReviewSource
  date: string           // ISO
  authorInitial: string | null  // single capital letter
  sentiment: SentimentScore | null
  topicIds: string[]
  complaintId: string | null
  piiStatus: PIIStatus | null
}

// ── Complaint ────────────────────────────────────────────────
export interface Complaint {
  id: string
  category: string
  activeCount: number
  severity: SeverityLevel
  trend: 'rising' | 'stable' | 'falling'
  trendPct: number
  description: string
  exampleReviewIds: string[]
  status: 'open' | 'investigating' | 'resolved'
  mentions?: number
  affectedProducts?: { id: string; name: string; mentions: number }[]
  affectedTopics?: { id: string; name: string; mentions: number }[]
}

// ── Insight ──────────────────────────────────────────────────
export interface Insight {
  id: string
  kind: InsightKind
  title: string
  summary: string
  confidence: number     // 0–1
  impact: InsightImpact
  topicId: string | null
  productId: string | null
  generatedAt: string    // ISO
  isNew: boolean
}

// ── Model Metrics ────────────────────────────────────────────
export interface ModelMetric {
  name: string
  accuracy: number
  precision: number
  recall: number
  f1: number
  macroF1: number
  latencyAvgMs: number
  latencyP95Ms: number
  drift: number
  lastRetrained: string  // ISO
  status: ComponentStatus
}

export interface ModelComponent {
  id: string
  name: string
  status: ComponentStatus
  metric?: string
  metricValue?: number
  lastChecked: string
}

export interface ModelHealth {
  overallStatus: ComponentStatus
  reviewsProcessedToday: number
  queueDepth: number
  lastValidation: string
  components: ModelComponent[]
  sentimentModel: ModelMetric
  topicModel: ModelMetric
  complaintClassifier: ModelMetric
  driftScore: number
  modelHistory: ModelHistoryEntry[]
}

export interface ModelHistoryEntry {
  date: string
  accuracy: number
  f1: number
  drift: number
  event?: string
}

// ── Analytics Summary ─────────────────────────────────────────
export interface KPIDelta {
  value: number          // absolute
  pct: number            // percentage change
  direction: 'up' | 'down' | 'flat'
  isPositive: boolean    // semantic: good or bad for the business
  comparisonLabel: string
}

export interface KPICard {
  id: string
  label: string
  value: number
  formattedValue: string
  delta: KPIDelta
  sparkline: number[]    // 7 data points
  unit?: string
}

export interface AnalyticsSummary {
  totalReviews: KPICard
  averageRating: KPICard
  positiveSentiment: KPICard
  neutralSentiment: KPICard
  negativeSentiment: KPICard
  activeComplaints: KPICard
  sentiment: SentimentSummary
  topics: Topic[]
  complaints: Complaint[]
  recentInsights: Insight[]
  spotlightReview: Review | null
  modelHealth: ModelHealth | null
  ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>
  sourceBreakdown: Record<ReviewSource, number>
  productBreakdown: Record<string, number>
  reviewVolume?: { date: string; reviewCount: number }[]
  productComparison?: {
    productId: string
    productName: string
    reviewCount: number
    averageRating: number
  }[]
  sourceComparison?: {
    source: ReviewSource
    reviewCount: number
    averageRating: number
  }[]
}

// ── App Settings ──────────────────────────────────────────────
export interface AppSettings {
  performanceTier: PerformanceTier
  reducedMotion: boolean
  theme: 'light' // only light for now
  autoRefresh: boolean
  refreshIntervalMs: number
}
