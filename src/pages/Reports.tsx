// ============================================================
// Reports Page
// ============================================================

// import React from 'react'
import { FileText } from 'lucide-react'

export function Reports() {
  return (
    <div className="page-section" style={{ paddingBottom: 80 }}>
      <header style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 30, fontWeight: 700, color: '#1C1033', letterSpacing: '-0.03em', marginBottom: 6 }}>
          Reports
        </h1>
        <p style={{ fontSize: 15, color: '#4B4466' }}>
          Generate, preview, and export executive briefs and summaries.
        </p>
      </header>
      
      <div className="glass-card" style={{ padding: 40, textAlign: 'center', minHeight: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(124,58,237,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
           <FileText size={24} style={{ color: '#A855F7' }} />
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1C1033', marginBottom: 8 }}>Report Generation</h2>
        <p style={{ fontSize: 14, color: '#8B83A3', maxWidth: 400 }}>Report templates and generation simulation coming soon.</p>
      </div>
    </div>
  )
}
