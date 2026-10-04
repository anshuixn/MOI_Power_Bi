// ============================================================
// Reviews Explorer Page
// Phase 18 implementation with glassmorphism and real mock data
// ============================================================

import { useState, useEffect } from 'react'
import { Download, Filter, Search, Star, ShieldCheck, ShieldAlert, Zap } from 'lucide-react'
import { reviewService } from '@/services/mock/reviewService'
import { useApp } from '@/hooks/useApp'
import type { Review } from '@/types'
import type { PaginatedResult } from '@/services/contracts'

function SentimentChip({ label, score }: { label: string, score: number }) {
  const colors = {
    positive: 'var(--color-positive)',
    neutral: 'var(--color-neutral)',
    negative: 'var(--color-negative)'
  }
  const bgs = {
    positive: 'var(--color-positive-soft)',
    neutral: 'var(--color-neutral-soft)',
    negative: 'var(--color-negative-soft)'
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: bgs[label as keyof typeof bgs], borderRadius: 6, color: colors[label as keyof typeof colors], fontSize: 12, fontWeight: 600 }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: colors[label as keyof typeof colors] }} />
      <span style={{ textTransform: 'capitalize' }}>{label}</span>
      <span style={{ opacity: 0.6, fontWeight: 500 }}>{Math.round(score * 100)}%</span>
    </div>
  )
}

export function ReviewsExplorer() {
  const { filters } = useApp()
  const [data, setData] = useState<PaginatedResult<Review> | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    reviewService.getReviews(filters, { page: 1, pageSize: 20, search })
      .then(res => {
        if (active && res.status === 'success') {
          setData(res.data)
        }
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [filters, search])

  return (
    <div className="page-section" style={{ paddingBottom: 80, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <header style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 600, color: '#1C1033', letterSpacing: '-0.03em', margin: '0 0 4px' }}>
            Reviews
          </h1>
          <p style={{ fontSize: 15, color: '#4B4466', margin: 0 }}>
            {data ? `${data.total.toLocaleString()} reviews found` : 'Loading reviews...'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="glass-interactive" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', color: '#1C1033', fontWeight: 500, fontSize: 14 }}>
            <Filter size={16} /> Filters
          </button>
          <button className="glass-interactive" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#7C3AED', color: '#fff', border: 'none', fontWeight: 500, fontSize: 14, boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>
            <Download size={16} /> Export CSV
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="review-main-layout" style={{ display: 'flex', gap: 24, flex: 1, minHeight: 0 }}>
        
        {/* Main List */}
        <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0 }}>
          {/* Search Bar */}
          <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(196, 181, 253, 0.25)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Search size={18} color="#8B83A3" />
            <input 
              type="text" 
              placeholder="Search reviews, products, or keywords..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 15, color: '#1C1033' }}
            />
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#8B83A3' }}>
                <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 20, margin: '0 auto 16px' }} />
                Loading intelligence...
              </div>
            ) : data?.items.map((review: Review) => (
              <div 
                key={review.id} 
                className="glass-secondary interactive"
                onClick={() => setSelectedReview(review)}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setSelectedReview(review)
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`Open ${review.productName} review details`}
                style={{ 
                  padding: 20, 
                  marginBottom: 12, 
                  cursor: 'pointer',
                  border: selectedReview?.id === review.id ? '1px solid #7C3AED' : undefined
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #7C3AED, #A855F7)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 14 }}>
                      {review.authorInitial}
                    </div>
                    <div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, color: '#1C1033', fontSize: 15 }}>{review.productName}</span>
                        <span style={{ color: '#8B83A3', fontSize: 13 }}>• {new Date(review.date).toLocaleDateString()}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={12} fill={i < review.rating ? "#FBBF24" : "transparent"} color={i < review.rating ? "#FBBF24" : "#D1D5DB"} />
                        ))}
                      </div>
                    </div>
                  </div>
                  {review.sentiment ? (
                    <SentimentChip label={review.sentiment.label} score={review.sentiment.confidence} />
                  ) : (
                    <span style={{ color: '#8B83A3', fontSize: 12 }}>Analysis pending</span>
                  )}
                </div>
                <p style={{ color: '#4B4466', fontSize: 15, lineHeight: 1.5, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {review.text}
                </p>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  {review.topicIds.slice(0, 3).map((topic: string) => (
                    <span key={topic} className="pill" style={{ background: 'rgba(124,58,237,0.05)', color: '#7C3AED' }}>
                      {topic.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail Drawer (Side Panel) */}
        {selectedReview ? (
          <div className="glass-card detail-drawer" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24, overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Review Details</h3>
              <button aria-label="Close review details" className="glass-interactive" onClick={() => setSelectedReview(null)} style={{ width: 32, height: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            
            <div>
               <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                 <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #7C3AED, #A855F7)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 18 }}>
                   {selectedReview.authorInitial}
                 </div>
                 <div>
                   <div style={{ fontWeight: 600, color: '#1C1033', fontSize: 16 }}>{selectedReview.productName}</div>
                   <div style={{ display: 'flex', gap: 2, marginTop: 4 }}>
                     {[...Array(5)].map((_, i) => (
                       <Star key={i} size={14} fill={i < selectedReview.rating ? "#FBBF24" : "transparent"} color={i < selectedReview.rating ? "#FBBF24" : "#D1D5DB"} />
                     ))}
                   </div>
                 </div>
               </div>
               
               <p style={{ color: '#4B4466', fontSize: 15, lineHeight: 1.6, margin: '0 0 24px' }}>
                 "{selectedReview.text}"
               </p>
               
               <div className="glass-secondary" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                   <span style={{ color: '#8B83A3', fontSize: 13 }}>Sentiment</span>
                   {selectedReview.sentiment ? (
                     <SentimentChip label={selectedReview.sentiment.label} score={selectedReview.sentiment.confidence} />
                   ) : (
                     <span style={{ color: '#8B83A3', fontSize: 12 }}>Analysis pending</span>
                   )}
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                   <span style={{ color: '#8B83A3', fontSize: 13 }}>Source</span>
                   <span style={{ color: '#1C1033', fontSize: 13, fontWeight: 500, textTransform: 'capitalize' }}>{selectedReview.source.replace('_', ' ')}</span>
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                   <span style={{ color: '#8B83A3', fontSize: 13 }}>Date</span>
                   <span style={{ color: '#1C1033', fontSize: 13, fontWeight: 500 }}>{new Date(selectedReview.date).toLocaleDateString()}</span>
                 </div>
               </div>
               
               <div style={{ marginTop: 24 }}>
                 <h4 style={{ margin: '0 0 12px', fontSize: 13, textTransform: 'uppercase', color: '#8B83A3', fontWeight: 600, letterSpacing: '0.05em' }}>Extracted Topics</h4>
                 <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                   {selectedReview.topicIds.map(topic => (
                     <span key={topic} className="pill" style={{ background: 'rgba(124,58,237,0.05)', color: '#7C3AED', padding: '6px 12px', fontSize: 13 }}>
                       {topic.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                     </span>
                   ))}
                 </div>
               </div>
               
               <div className="glass-secondary" style={{ marginTop: 24, padding: 16, background: selectedReview.piiStatus ? (selectedReview.piiStatus.isClean ? 'rgba(16,185,129,0.05)' : 'rgba(245,158,11,0.05)') : 'rgba(139,131,163,0.05)' }}>
                 <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                   {selectedReview.piiStatus
                     ? selectedReview.piiStatus.isClean
                       ? <ShieldCheck size={18} color="#10B981" />
                       : <ShieldAlert size={18} color="#F59E0B" />
                     : null}
                   <span style={{ fontWeight: 600, fontSize: 14, color: selectedReview.piiStatus ? (selectedReview.piiStatus.isClean ? '#10B981' : '#F59E0B') : '#8B83A3' }}>
                     {!selectedReview.piiStatus ? 'PII status unavailable' : selectedReview.piiStatus.isClean ? 'PII Clean' : 'PII Redacted'}
                   </span>
                 </div>
                 <p style={{ margin: 0, fontSize: 13, color: '#4B4466' }}>
                   {!selectedReview.piiStatus ? 'PII processing has not completed for this review.' : selectedReview.piiStatus.isClean ? 'No personally identifiable information detected in this review.' : `Redacted fields: ${selectedReview.piiStatus.redactedFields.join(', ')}`}
                 </p>
               </div>
            </div>
          </div>
        ) : (
          <div className="glass-card review-empty-state" style={{ width: 380, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(124,58,237,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
               <Zap size={28} color="#C4B5FD" />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, color: '#1C1033', fontWeight: 600 }}>Select a review</h3>
            <p style={{ margin: 0, fontSize: 14, color: '#8B83A3' }}>
              Click on any review in the list to view detailed sentiment analysis, extracted topics, and PII status.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
