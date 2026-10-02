// ============================================================
// Complaint Intelligence Panel
// ============================================================

import { AlertTriangle, TrendingUp } from 'lucide-react'
import type { Complaint } from '@/types'

interface ComplaintIntelligenceProps {
  complaints: Complaint[]
  totalComplaints: number
}

export function ComplaintIntelligence({ complaints, totalComplaints }: ComplaintIntelligenceProps) {
  const critical = complaints.filter(c => c.severity === 'critical').reduce((a, c) => a + c.activeCount, 0)
  const high = complaints.filter(c => c.severity === 'high').reduce((a, c) => a + c.activeCount, 0)
  const medium = complaints.filter(c => c.severity === 'medium').reduce((a, c) => a + c.activeCount, 0)
  const low = complaints.filter(c => c.severity === 'low').reduce((a, c) => a + c.activeCount, 0)

  const critPct = (critical / totalComplaints) * 100 || 0
  const highPct = (high / totalComplaints) * 100 || 0
  const medPct = (medium / totalComplaints) * 100 || 0
  const lowPct = (low / totalComplaints) * 100 || 0

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      {/* Big KPI */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: '#1B1F2A', lineHeight: 1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
          {totalComplaints.toLocaleString()}
        </div>
        <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4, marginBottom: 8 }}>Total Complaints</div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 999, background: '#FCE3E5', color: '#EA6670', fontSize: 12, fontWeight: 600 }}>
          <TrendingUp size={12} strokeWidth={2} />
          18.4%
        </div>
      </div>

      {/* Breakdown list */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { label: 'Critical', pct: critPct, color: '#EA6670' },
          { label: 'High', pct: highPct, color: '#F5821F' },
          { label: 'Medium', pct: medPct, color: '#FFC857' },
          { label: 'Low', pct: lowPct, color: '#4C8BD4' },
        ].map(row => (
          <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: row.color }} />
            <span style={{ fontSize: 13, color: '#4A5160', flex: 1 }}>{row.label}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#1B1F2A', fontVariantNumeric: 'tabular-nums' }}>
              {row.pct.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>

      {/* Donut representation */}
      <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
        <svg width={80} height={80} viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="40" cy="40" r="32" fill="none" stroke="#F5EFE6" strokeWidth="12" />
          {/* We'll just draw a simplified representation here for the design */}
          <circle cx="40" cy="40" r="32" fill="none" stroke="#EA6670" strokeWidth="12" strokeDasharray={`${critPct * 2} 200`} strokeDashoffset="0" />
          <circle cx="40" cy="40" r="32" fill="none" stroke="#F5821F" strokeWidth="12" strokeDasharray={`${highPct * 2} 200`} strokeDashoffset={`-${critPct * 2}`} />
          <circle cx="40" cy="40" r="32" fill="none" stroke="#FFC857" strokeWidth="12" strokeDasharray={`${medPct * 2} 200`} strokeDashoffset={`-${(critPct + highPct) * 2}`} />
          <circle cx="40" cy="40" r="32" fill="none" stroke="#4C8BD4" strokeWidth="12" strokeDasharray={`${lowPct * 2} 200`} strokeDashoffset={`-${(critPct + highPct + medPct) * 2}`} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AlertTriangle size={16} strokeWidth={2} color="#EA6670" />
        </div>
      </div>
    </div>
  )
}
