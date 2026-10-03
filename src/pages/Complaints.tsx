// ============================================================
// Complaints Page
// Phase 20 implementation with severity list and investigation drawer
// ============================================================

import { useState, useEffect } from 'react'
import { AlertTriangle, TrendingUp, TrendingDown, Minus, Search, Clock, CheckCircle } from 'lucide-react'
import { complaintService } from '@/services/mock/complaintService'
import { reviewService } from '@/services/mock/reviewService'
import { useApp } from '@/hooks/useApp'
import type { Complaint, Review } from '@/types'

function SeverityBadge({ severity }: { severity: 'low' | 'medium' | 'high' | 'critical' }) {
  const colors = {
    low: { bg: 'rgba(16,185,129,0.1)', color: '#10B981', border: 'rgba(16,185,129,0.3)' },
    medium: { bg: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: 'rgba(245,158,11,0.3)' },
    high: { bg: 'rgba(239,68,68,0.1)', color: '#EF4444', border: 'rgba(239,68,68,0.3)' },
    critical: { bg: 'rgba(220,38,38,0.15)', color: '#DC2626', border: 'rgba(220,38,38,0.5)' }
  }
  const config = colors[severity]
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: config.bg, border: `1px solid ${config.border}`, borderRadius: 6, color: config.color, fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>
      {severity}
    </div>
  )
}

function StatusBadge({ status }: { status: 'open' | 'investigating' | 'resolved' }) {
  const config = {
    open: { icon: AlertTriangle, color: '#EF4444' },
    investigating: { icon: Clock, color: '#F59E0B' },
    resolved: { icon: CheckCircle, color: '#10B981' }
  }[status]
  
  const Icon = config.icon
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: config.color, fontSize: 13, fontWeight: 500, textTransform: 'capitalize' }}>
      <Icon size={14} /> {status}
    </div>
  )
}

function TrendIndicator({ direction, pct }: { direction: 'rising' | 'falling' | 'stable', pct: number }) {
  if (direction === 'rising') return <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#EF4444', fontSize: 13, fontWeight: 600 }}><TrendingUp size={14} /> +{pct}%</div>
  if (direction === 'falling') return <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10B981', fontSize: 13, fontWeight: 600 }}><TrendingDown size={14} /> -{pct}%</div>
  return <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#8B83A3', fontSize: 13, fontWeight: 600 }}><Minus size={14} /> {pct}%</div>
}

export function Complaints() {
  const { filters } = useApp()
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [sampleReviews, setSampleReviews] = useState<Review[]>([])

  useEffect(() => {
    let active = true
    setLoading(true)
    complaintService.getComplaints(filters).then(res => {
      if (active && res.status === 'success') {
        const filtered = search ? res.data.filter(c => c.category.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase())) : res.data
        setComplaints(filtered)
      }
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [filters, search])

  useEffect(() => {
    if (!selectedComplaint) return
    let active = true
    Promise.all(selectedComplaint.exampleReviewIds.map(id => reviewService.getReviewById(id)))
      .then(results => {
        if (active) {
          setSampleReviews(results.filter(r => r.status === 'success').map(r => (r as any).data))
        }
      })
    return () => { active = false }
  }, [selectedComplaint])

  return (
    <div className="page-section" style={{ paddingBottom: 80, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <header style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 600, color: '#1C1033', letterSpacing: '-0.03em', margin: '0 0 4px' }}>
            Complaints & Issues
          </h1>
          <p style={{ fontSize: 15, color: '#4B4466', margin: 0 }}>
            {complaints.length} active issue categories identified.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.6)', padding: '8px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.8)', gap: 8 }}>
          <Search size={16} color="#8B83A3" />
          <input 
            type="text" 
            placeholder="Search issues..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 14, color: '#1C1033', width: 220 }}
          />
        </div>
      </header>

      {/* Main Layout */}
      <div className="complaint-main-layout" style={{ display: 'flex', gap: 24, flex: 1, minHeight: 0 }}>
        
        {/* List of Complaints */}
        <div className="glass-card" style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#8B83A3' }}>
              <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 20, margin: '0 auto 16px' }} />
              Loading issues...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {complaints.map(complaint => (
                <div 
                  key={complaint.id} 
                  className="glass-secondary interactive"
                  onClick={() => setSelectedComplaint(complaint)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setSelectedComplaint(complaint)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open ${complaint.category} details`}
                  style={{ 
                    cursor: 'pointer',
                    border: selectedComplaint?.id === complaint.id ? '1px solid #7C3AED' : undefined,
                    padding: 20
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <SeverityBadge severity={complaint.severity} />
                      <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#1C1033' }}>{complaint.category}</h3>
                    </div>
                    <TrendIndicator direction={complaint.trend} pct={complaint.trendPct} />
                  </div>
                  
                  <p style={{ margin: '0 0 16px', fontSize: 14, color: '#4B4466', lineHeight: 1.5 }}>
                    {complaint.description}
                  </p>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '1px solid rgba(196,181,253,0.2)' }}>
                    <div style={{ fontSize: 13, color: '#8B83A3' }}>
                      <strong style={{ color: '#1C1033' }}>{complaint.activeCount.toLocaleString()}</strong> related reviews
                    </div>
                    <StatusBadge status={complaint.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail Drawer (Side Panel) */}
        {selectedComplaint && (
          <div className="glass-card detail-drawer" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24, overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <SeverityBadge severity={selectedComplaint.severity} />
                <h3 style={{ margin: '8px 0 4px', fontSize: 22, fontWeight: 600 }}>{selectedComplaint.category}</h3>
              </div>
              <button aria-label="Close complaint details" className="glass-interactive" onClick={() => setSelectedComplaint(null)} style={{ width: 32, height: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            
            <p style={{ margin: 0, fontSize: 15, color: '#4B4466', lineHeight: 1.6 }}>
              {selectedComplaint.description}
            </p>
            
            <div className="glass-secondary" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <span style={{ color: '#8B83A3', fontSize: 13 }}>Current Status</span>
                 <StatusBadge status={selectedComplaint.status} />
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <span style={{ color: '#8B83A3', fontSize: 13 }}>Impacted Reviews</span>
                 <span style={{ color: '#1C1033', fontSize: 14, fontWeight: 600 }}>{selectedComplaint.activeCount.toLocaleString()}</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <span style={{ color: '#8B83A3', fontSize: 13 }}>Recent Trend</span>
                 <TrendIndicator direction={selectedComplaint.trend} pct={selectedComplaint.trendPct} />
               </div>
            </div>
            
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="glass-interactive" style={{ flex: 1, padding: '10px 16px', background: '#7C3AED', color: '#fff', border: 'none', fontWeight: 500, fontSize: 14, boxShadow: '0 4px 12px rgba(124,58,237,0.3)', borderRadius: 8 }}>
                Start Investigation
              </button>
              <button className="glass-interactive" style={{ flex: 1, padding: '10px 16px', color: '#1C1033', fontWeight: 500, fontSize: 14, borderRadius: 8 }}>
                Resolve Issue
              </button>
            </div>
            
            <div style={{ marginTop: 8 }}>
              <h4 style={{ margin: '0 0 12px', fontSize: 13, textTransform: 'uppercase', color: '#8B83A3', fontWeight: 600, letterSpacing: '0.05em' }}>Example Reviews</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {sampleReviews.map(review => (
                  <div key={review.id} className="glass-secondary" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                       <span style={{ fontWeight: 600, fontSize: 14, color: '#1C1033' }}>{review.productName}</span>
                       <span style={{ fontSize: 12, color: '#8B83A3' }}>{new Date(review.date).toLocaleDateString()}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 14, color: '#4B4466', lineHeight: 1.5 }}>
                      "{review.text}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
