import type { Result, FilterState, Complaint } from '@/types'
import type { IComplaintService } from '@/services/contracts'
import { COMPLAINTS } from '@/data/mockData'

function sleep(ms: number) { return new Promise<void>(r => setTimeout(r, ms)) }

export class MockComplaintService implements IComplaintService {
  async getComplaints(filters: FilterState): Promise<Result<Complaint[]>> {
    await sleep(290)
    const m = Math.min(filters.productId ? 0.31 : filters.source ? 0.42 : 1.0, 1.0)
    return {
      status: 'success',
      data: COMPLAINTS.map(c => ({ ...c, activeCount: Math.round(c.activeCount * m) })),
    }
  }

  async getComplaintById(id: string): Promise<Result<Complaint>> {
    await sleep(160)
    const complaint = COMPLAINTS.find(c => c.id === id)
    if (!complaint) return { status: 'error', error: `Complaint ${id} not found`, code: 404 }
    return { status: 'success', data: complaint }
  }
}

export const complaintService = new MockComplaintService()
