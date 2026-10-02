import type { Result } from '@/types'
import type { IModelHealthService } from '@/services/contracts'
import type { ModelHealth } from '@/types'
import { MODEL_HEALTH_DATA } from '@/data/mockData'

function sleep(ms: number) { return new Promise<void>(r => setTimeout(r, ms)) }

export class MockModelHealthService implements IModelHealthService {
  async getModelHealth(): Promise<Result<ModelHealth>> {
    await sleep(260)
    return { status: 'success', data: MODEL_HEALTH_DATA }
  }
}

export const modelHealthService = new MockModelHealthService()
