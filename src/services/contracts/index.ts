// ============================================================
// ReviewBand Service Contracts
// UI depends only on these interfaces — not on mock implementations.
// Future: replace services/mock/ with services/api/ here.
// ============================================================

import type {
  Result,
  AnalyticsSummary,
  FilterState,
  Review,
  Topic,
  Complaint,
  Insight,
  ModelHealth,
  Product,
  InsightKind,
  InsightImpact,
  SentimentLabel,
} from '@/types'

// ── Review Filter Options ─────────────────────────────────────
export interface ReviewFilterOptions {
  search?: string
  sentiment?: SentimentLabel | null
  rating?: number | null
  topicId?: string | null
  page?: number
  pageSize?: number
  sortBy?: 'date' | 'rating' | 'confidence'
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}

// ── Insight Filter Options ────────────────────────────────────
export interface InsightFilterOptions {
  kind?: InsightKind | null
  impact?: InsightImpact | null
  topicId?: string | null
  productId?: string | null
  minConfidence?: number
}

// ── Analytics Service ─────────────────────────────────────────
export interface IAnalyticsService {
  getSummary(filters: FilterState): Promise<Result<AnalyticsSummary>>
}

// ── Review Service ────────────────────────────────────────────
export interface IReviewService {
  getReviews(
    filters: FilterState,
    options: ReviewFilterOptions
  ): Promise<Result<PaginatedResult<Review>>>
  getReviewById(id: string): Promise<Result<Review>>
}

// ── Topic Service ─────────────────────────────────────────────
export interface ITopicService {
  getTopics(filters: FilterState): Promise<Result<Topic[]>>
  getTopicById(id: string): Promise<Result<Topic>>
  getTopicReviews(topicId: string, filters: FilterState): Promise<Result<Review[]>>
}

// ── Complaint Service ─────────────────────────────────────────
export interface IComplaintService {
  getComplaints(filters: FilterState): Promise<Result<Complaint[]>>
  getComplaintById(id: string): Promise<Result<Complaint>>
}

// ── Insight Service ───────────────────────────────────────────
export interface IInsightService {
  getInsights(
    filters: FilterState,
    options: InsightFilterOptions
  ): Promise<Result<Insight[]>>
}

// ── Model Health Service ──────────────────────────────────────
export interface IModelHealthService {
  getModelHealth(): Promise<Result<ModelHealth>>
}

// ── Product Service ───────────────────────────────────────────
export interface IProductService {
  getProducts(): Promise<Result<Product[]>>
}
