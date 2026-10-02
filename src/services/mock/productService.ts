import type { Result, Product } from '@/types'
import type { IProductService } from '@/services/contracts'
import { PRODUCTS } from '@/data/mockData'

function sleep(ms: number) { return new Promise<void>(r => setTimeout(r, ms)) }

export class MockProductService implements IProductService {
  async getProducts(): Promise<Result<Product[]>> {
    await sleep(150)
    return { status: 'success', data: PRODUCTS }
  }
}

export const productService = new MockProductService()
