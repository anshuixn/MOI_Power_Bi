// ============================================================
// Topic Intelligence Page
// Phase 19 implementation with interactive masonry grid
// ============================================================

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Minus, Search } from 'lucide-react'
import { topicService } from '@/services/mock/topicService'
import { reviewService } from '@/services/mock/reviewService'
import { useApp } from '@/hooks/useApp'
import type { Topic, Review } from '@/types'

function TrendIndicator({ direction, pct }: { direction: 'rising' | 'falling' | 'stable', pct: number }) {
  if (direction === 'rising') return <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10B981', fontSize: 13, fontWeight: 600 }}><TrendingUp size={14} /> +{pct}%</div>
  if (direction === 'falling') return <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#F87171', fontSize: 13, fontWeight: 600 }}><TrendingDown size={14} /> -{pct}%</div>
  return <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#8B83A3', fontSize: 13, fontWeight: 600 }}><Minus size={14} /> {pct}%</div>
}

export function TopicIntelligence() {
  const { filters } = useApp()
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
  const [sampleReviews, setSampleReviews] = useState<Review[]>([])

  useEffect(() => {
    let active = true
    setLoading(true)
    topicService.getTopics(filters).then(res => {
      if (active && res.status === 'success') {
        const filtered = search ? res.data.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.keywords.some(k => k.toLowerCase().includes(search.toLowerCase()))) : res.data
        setTopics(filtered)
      }
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [filters, search])

  useEffect(() => {
    if (!selectedTopic) return
    let active = true
    Promise.all(selectedTopic.sampleReviewIds.map(id => reviewService.getReviewById(id)))
      .then(results => {
        if (active) {
          setSampleReviews(results.filter(r => r.status === 'success').map(r => (r as any).data))
        }
      })
    return () => { active = false }
  }, [selectedTopic])

  return (
    <div className="page-section" style={{ paddingBottom: 80, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <header style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 600, color: '#1C1033', letterSpacing: '-0.03em', margin: '0 0 4px' }}>
            Topic Intelligence
          </h1>
          <p style={{ fontSize: 15, color: '#4B4466', margin: 0 }}>
            {topics.length} recurring themes detected in customer feedback.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.6)', padding: '8px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.8)', gap: 8 }}>
          <Search size={16} color="#8B83A3" />
          <input 
            type="text" 
            placeholder="Search topics or keywords..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 14, color: '#1C1033', width: 220 }}
          />
        </div>
      </header>

      {/* Main Layout */}
      <div style={{ display: 'flex', gap: 24, flex: 1, minHeight: 0 }}>
        
        {/* Masonry Grid of Topics */}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 24 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#8B83A3' }}>
              <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 20, margin: '0 auto 16px' }} />
              Analyzing semantic clusters...
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
              {topics.map(topic => (
                <div 
                  key={topic.id} 
                  className="glass-card interactive"
                  onClick={() => setSelectedTopic(topic)}
                  style={{ 
                    cursor: 'pointer',
                    border: selectedTopic?.id === topic.id ? '1px solid #7C3AED' : undefined,
                    display: 'flex', flexDirection: 'column'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 600, color: '#1C1033' }}>{topic.name}</h3>
                      <div style={{ fontSize: 13, color: '#8B83A3' }}>{topic.mentions.toLocaleString()} mentions</div>
                    </div>
                    <TrendIndicator direction={topic.trend} pct={topic.trendPct} />
                  </div>
                  
                  {/* Sentiment Bar */}
                  <div style={{ height: 6, display: 'flex', borderRadius: 3, overflow: 'hidden', marginBottom: 16 }}>
                    <div style={{ width: `${topic.positivePct}%`, background: 'var(--color-positive)' }} />
                    <div style={{ width: `${topic.neutralPct}%`, background: 'var(--color-neutral)' }} />
                    <div style={{ width: `${topic.negativePct}%`, background: 'var(--color-negative)' }} />
                  </div>
                  
                  {/* Keywords */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 'auto' }}>
                    {topic.keywords.map(kw => (
                      <span key={kw} className="pill" style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(196,181,253,0.3)', color: '#4B4466' }}>
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail Drawer (Side Panel) */}
        {selectedTopic && (
          <div className="glass-card" style={{ width: 400, padding: 24, display: 'flex', flexDirection: 'column', gap: 24, overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 600 }}>{selectedTopic.name}</h3>
                <div style={{ fontSize: 14, color: '#8B83A3' }}>{selectedTopic.mentions.toLocaleString()} total mentions</div>
              </div>
              <button className="glass-interactive" onClick={() => setSelectedTopic(null)} style={{ width: 32, height: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            
            <div className="glass-secondary" style={{ padding: 20 }}>
               <h4 style={{ margin: '0 0 12px', fontSize: 13, textTransform: 'uppercase', color: '#8B83A3', fontWeight: 600, letterSpacing: '0.05em' }}>Sentiment Breakdown</h4>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                 <div style={{ textAlign: 'center' }}>
                   <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-positive)' }}>{Math.round(selectedTopic.positivePct)}%</div>
                   <div style={{ fontSize: 12, color: '#8B83A3' }}>Positive</div>
                 </div>
                 <div style={{ textAlign: 'center' }}>
                   <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-neutral)' }}>{Math.round(selectedTopic.neutralPct)}%</div>
                   <div style={{ fontSize: 12, color: '#8B83A3' }}>Neutral</div>
                 </div>
                 <div style={{ textAlign: 'center' }}>
                   <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-negative)' }}>{Math.round(selectedTopic.negativePct)}%</div>
                   <div style={{ fontSize: 12, color: '#8B83A3' }}>Negative</div>
                 </div>
               </div>
            </div>
            
            <div>
              <h4 style={{ margin: '0 0 12px', fontSize: 13, textTransform: 'uppercase', color: '#8B83A3', fontWeight: 600, letterSpacing: '0.05em' }}>Sample Reviews</h4>
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
