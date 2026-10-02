// ============================================================
// ReviewBand Mock Review Service
// ============================================================

import type { Result, FilterState, Review, SentimentLabel } from '@/types'
import type { IReviewService, ReviewFilterOptions, PaginatedResult } from '@/services/contracts'
import { REVIEWS } from '@/data/mockData'

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export class MockReviewService implements IReviewService {
  async getReviews(
    filters: FilterState,
    options: ReviewFilterOptions
  ): Promise<Result<PaginatedResult<Review>>> {
    await sleep(320)

    let items = [...REVIEWS]

    // Apply product filter
    if (filters.productId) {
      items = items.filter(r => r.productId === filters.productId)
    }

    // Apply source filter
    if (filters.source) {
      items = items.filter(r => r.source === filters.source)
    }

    // Apply search
    if (options.search) {
      const q = options.search.toLowerCase()
      items = items.filter(r =>
        r.text.toLowerCase().includes(q) ||
        r.productName.toLowerCase().includes(q)
      )
    }

    // Apply sentiment filter
    if (options.sentiment) {
      items = items.filter(r => r.sentiment.label === (options.sentiment as SentimentLabel))
    }

    // Apply rating filter
    if (options.rating !== undefined && options.rating !== null) {
      items = items.filter(r => r.rating === options.rating)
    }

    // Apply topic filter
    if (options.topicId) {
      items = items.filter(r => r.topicIds.includes(options.topicId!))
    }

    // Sort
    const sortBy = options.sortBy ?? 'date'
    const sortOrder = options.sortOrder ?? 'desc'
    items.sort((a, b) => {
      let cmp = 0
      if (sortBy === 'date') cmp = a.date.localeCompare(b.date)
      else if (sortBy === 'rating') cmp = a.rating - b.rating
      else if (sortBy === 'confidence') cmp = a.sentiment.confidence - b.sentiment.confidence
      return sortOrder === 'desc' ? -cmp : cmp
    })

    // Paginate
    const page = options.page ?? 1
    const pageSize = options.pageSize ?? 10
    const total = items.length
    const pageCount = Math.max(1, Math.ceil(total / pageSize))
    const paged = items.slice((page - 1) * pageSize, page * pageSize)

    return {
      status: 'success',
      data: { items: paged, total, page, pageSize, pageCount },
    }
  }

  async getReviewById(id: string): Promise<Result<Review>> {
    await sleep(180)
    const review = REVIEWS.find(r => r.id === id)
    if (!review) return { status: 'error', error: `Review ${id} not found`, code: 404 }
    return { status: 'success', data: review }
  }
}

export const reviewService = new MockReviewService()
