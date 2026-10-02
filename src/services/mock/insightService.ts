import type { Result, FilterState, Insight } from '@/types'
import type { IInsightService, InsightFilterOptions } from '@/services/contracts'
import { INSIGHTS } from '@/data/mockData'

function sleep(ms: number) { return new Promise<void>(r => setTimeout(r, ms)) }

export class MockInsightService implements IInsightService {
  async getInsights(
    _filters: FilterState,
    options: InsightFilterOptions
  ): Promise<Result<Insight[]>> {
    await sleep(310)
    let items = [...INSIGHTS]
    if (options.kind) items = items.filter(i => i.kind === options.kind)
    if (options.impact) items = items.filter(i => i.impact === options.impact)
    if (options.topicId) items = items.filter(i => i.topicId === options.topicId)
    if (options.productId) items = items.filter(i => i.productId === options.productId)
    if (options.minConfidence !== undefined) {
      items = items.filter(i => i.confidence >= (options.minConfidence ?? 0))
    }
    return { status: 'success', data: items }
  }
}

export const insightService = new MockInsightService()
