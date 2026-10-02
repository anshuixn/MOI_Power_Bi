import type { Result, FilterState, Topic, Review } from '@/types'
import type { ITopicService } from '@/services/contracts'
import { TOPICS, REVIEWS } from '@/data/mockData'

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export class MockTopicService implements ITopicService {
  async getTopics(filters: FilterState): Promise<Result<Topic[]>> {
    await sleep(280)
    const m = filters.productId ? 0.31 : filters.source ? 0.42 : 1.0
    return {
      status: 'success',
      data: TOPICS.map(t => ({ ...t, mentions: Math.round(t.mentions * m) })),
    }
  }

  async getTopicById(id: string): Promise<Result<Topic>> {
    await sleep(180)
    const topic = TOPICS.find(t => t.id === id)
    if (!topic) return { status: 'error', error: `Topic ${id} not found`, code: 404 }
    return { status: 'success', data: topic }
  }

  async getTopicReviews(topicId: string, _filters: FilterState): Promise<Result<Review[]>> {
    await sleep(250)
    const reviews = REVIEWS.filter(r => r.topicIds.includes(topicId))
    return { status: 'success', data: reviews }
  }
}

export const topicService = new MockTopicService()
