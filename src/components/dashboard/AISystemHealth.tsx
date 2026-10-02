// ============================================================
// AI System Health
// ============================================================

import type { ModelHealth } from '@/types'
import { Clock } from 'lucide-react'

interface AISystemHealthProps {
  health: ModelHealth
}

function StatusIndicator({ status }: { status: string }) {
  const isOnline = status === 'online'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: isOnline ? '#2E9E73' : '#F2A33A' }} />
      <span style={{ fontSize: 13, color: isOnline ? '#2E9E73' : '#F2A33A', fontWeight: 500 }}>
        {isOnline ? 'Online' : 'Degraded'}
      </span>
    </div>
  )
}

export function AISystemHealth({ health }: AISystemHealthProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Component list */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: '#4A5160' }}>Sentiment Model</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <StatusIndicator status={health.sentimentModel.status} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1B1F2A', width: 40, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {health.sentimentModel.accuracy.toFixed(1)}%
          </span>
        </div>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: '#4A5160' }}>Topic Model</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <StatusIndicator status={health.topicModel.status} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1B1F2A', width: 40, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {(health.topicModel.accuracy).toFixed(1)}%
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: '#4A5160' }}>PII Scrubber</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2E9E73' }} />
            <span style={{ fontSize: 13, color: '#2E9E73', fontWeight: 500 }}>Active</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#6B7280', width: 40, textAlign: 'right' }}>—</span>
        </div>
      </div>

      <div style={{ height: 1, background: '#DDE4EE', margin: '4px 0' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: '#4A5160' }}>Model Drift</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2E9E73' }} />
            <span style={{ fontSize: 13, color: '#2E9E73', fontWeight: 500 }}>Normal</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1B1F2A', width: 40, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {health.driftScore.toFixed(2)}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <span style={{ fontSize: 12, color: '#6B7280' }}>Last Validation</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#1B1F2A' }}>
          <Clock size={12} />
          <span style={{ fontSize: 12, fontWeight: 500 }}>2 hours ago</span>
        </div>
      </div>
    </div>
  )
}
