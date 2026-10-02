// ============================================================
// Analytics Workspace Page
// ============================================================

// import React from 'react'
import { BarChart3 } from 'lucide-react'

export function AnalyticsWorkspace() {
  return (
    <div className="page-section" style={{ paddingBottom: 80 }}>
      <header style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 30, fontWeight: 700, color: '#1C1033', letterSpacing: '-0.03em', marginBottom: 6 }}>
          Analytics Workspace
        </h1>
        <p style={{ fontSize: 15, color: '#4B4466' }}>
          Deep dive into sentiment trends, product comparisons, and rating distributions.
        </p>
      </header>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="glass-card" style={{ padding: 24, minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: '#8B83A3' }}>Rating Distribution Chart Placeholder</p>
        </div>
        <div className="glass-card" style={{ padding: 24, minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: '#8B83A3' }}>Source Breakdown Chart Placeholder</p>
        </div>
      </div>
      
      <div className="glass-card" style={{ padding: 24, minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(124,58,237,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
             <BarChart3 size={24} style={{ color: '#A855F7' }} />
          </div>
          <p style={{ color: '#8B83A3' }}>Advanced Analytics Implementation Coming Soon</p>
        </div>
      </div>
    </div>
  )
}
