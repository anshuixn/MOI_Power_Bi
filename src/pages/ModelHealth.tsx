import { useState, useEffect } from 'react'
import { Activity, CheckCircle, AlertTriangle, XCircle, Cpu, Clock, Zap } from 'lucide-react'
import { modelHealthService } from '@/services/mock/modelHealthService'
import type { ModelHealth as ModelHealthType, ComponentStatus } from '@/types'

function StatusDot({ status }: { status: ComponentStatus }) {
  const map = {
    online: { color: '#10B981', label: 'Online' },
    degraded: { color: '#F59E0B', label: 'Degraded' },
    offline: { color: '#F43F5E', label: 'Offline' },
    maintenance: { color: '#8B5CF6', label: 'Maintenance' },
  }
  const s = map[status]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
      <span style={{ fontSize: 12, fontWeight: 600, color: s.color }}>{s.label}</span>
    </div>
  )
}

function MetricCard({ label, value, unit, color }: { label: string; value: string; unit?: string; color: string }) {
  return (
    <div className="glass-secondary" style={{ padding: '16px 20px', borderRadius: 12, textAlign: 'center' }}>
      <div style={{ fontSize: 24, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{value}<span style={{ fontSize: 14, fontWeight: 400, color: '#8B83A3', marginLeft: 4 }}>{unit}</span></div>
      <div style={{ fontSize: 12, color: '#8B83A3', marginTop: 4 }}>{label}</div>
    </div>
  )
}

function RadarChart({ data }: { data: { label: string; value: number }[] }) {
  const cx = 120, cy = 120, r = 90
  const angles = data.map((_, i) => (i / data.length) * 2 * Math.PI - Math.PI / 2)
  const gridLevels = [0.25, 0.5, 0.75, 1.0]
  const pts = data.map((d, i) => {
    const a = angles[i]
    const dist = (d.value / 100) * r
    return { x: cx + dist * Math.cos(a), y: cy + dist * Math.sin(a) }
  })
  const polygon = pts.map(p => `${p.x},${p.y}`).join(' ')
  return (
    <svg viewBox="0 0 240 240" style={{ width: '100%', maxWidth: 220 }}>
      {gridLevels.map(level => {
        const gridPts = data.map((_, i) => {
          const a = angles[i]
          const dist = level * r
          return `${cx + dist * Math.cos(a)},${cy + dist * Math.sin(a)}`
        }).join(' ')
        return <polygon key={level} points={gridPts} fill="none" stroke="rgba(124,58,237,0.1)" strokeWidth="1" />
      })}
      {data.map((_, i) => (
        <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(angles[i])} y2={cy + r * Math.sin(angles[i])} stroke="rgba(124,58,237,0.1)" strokeWidth="1" />
      ))}
      <polygon points={polygon} fill="rgba(168,85,247,0.2)" stroke="#A855F7" strokeWidth="2" strokeLinejoin="round" />
      {data.map((d, i) => (
        <text key={i} x={cx + (r + 16) * Math.cos(angles[i])} y={cy + (r + 16) * Math.sin(angles[i])} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="#8B83A3">{d.label}</text>
      ))}
    </svg>
  )
}

export function ModelHealth() {
  const [health, setHealth] = useState<ModelHealthType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    modelHealthService.getModelHealth().then(res => {
      if (active && res.status === 'success') {
        setHealth(res.data)
        setLoading(false)
      }
    })
    return () => { active = false }
  }, [])

  const statusIcon = (s: ComponentStatus) => {
    if (s === 'online') return <CheckCircle size={16} style={{ color: '#10B981' }} />
    if (s === 'degraded') return <AlertTriangle size={16} style={{ color: '#F59E0B' }} />
    return <XCircle size={16} style={{ color: '#F43F5E' }} />
  }

  return (
    <div className="page-section" style={{ paddingBottom: 80 }}>
      <header style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 30, fontWeight: 700, color: '#1C1033', letterSpacing: '-0.03em', marginBottom: 6 }}>Model Health</h1>
        <p style={{ fontSize: 15, color: '#4B4466' }}>Observability metrics, accuracy, latency, and drift for NLP systems.</p>
      </header>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {[1,2,3,4].map(i => <div key={i} className="glass-card skeleton" style={{ height: 200 }} />)}
        </div>
      ) : health && (
        <>
          {/* Overall Status */}
          <div className="glass-card" style={{ padding: 24, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(16,185,129,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={22} style={{ color: '#10B981' }} />
              </div>
              <div>
                <div style={{ fontSize: 13, color: '#8B83A3', fontWeight: 500 }}>System Status</div>
                <StatusDot status={health.overallStatus} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 32 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#1C1033' }}>{health.reviewsProcessedToday.toLocaleString()}</div>
                <div style={{ fontSize: 12, color: '#8B83A3' }}>Processed Today</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#1C1033' }}>{health.queueDepth}</div>
                <div style={{ fontSize: 12, color: '#8B83A3' }}>Queue Depth</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: (health.driftScore < 0.05 ? '#10B981' : health.driftScore < 0.1 ? '#F59E0B' : '#F43F5E') }}>{(health.driftScore * 100).toFixed(1)}%</div>
                <div style={{ fontSize: 12, color: '#8B83A3' }}>Drift Score</div>
              </div>
            </div>
          </div>

          {/* Model Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 20 }}>
            {[
              { label: 'Sentiment Model', model: health.sentimentModel },
              { label: 'Topic Model', model: health.topicModel },
              { label: 'Complaint Classifier', model: health.complaintClassifier },
            ].map(({ label, model }) => (
              <div key={label} className="glass-card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Cpu size={16} style={{ color: '#A855F7' }} />
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#1C1033' }}>{label}</span>
                  </div>
                  <StatusDot status={model.status} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                  <MetricCard label="Accuracy" value={(model.accuracy * 100).toFixed(1)} unit="%" color="#7C3AED" />
                  <MetricCard label="F1 Score" value={(model.f1 * 100).toFixed(1)} unit="%" color="#3B82F6" />
                  <MetricCard label="P95 Latency" value={model.latencyP95Ms.toString()} unit="ms" color="#10B981" />
                  <MetricCard label="Drift" value={(model.drift * 100).toFixed(2)} unit="%" color={model.drift < 0.05 ? '#10B981' : '#F59E0B'} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#8B83A3', fontSize: 12 }}>
                  <Clock size={12} />
                  Retrained: {new Date(model.lastRetrained).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>

          {/* Radar Chart + Components */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="glass-card" style={{ padding: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1C1033', marginBottom: 20, margin: '0 0 20px' }}>Sentiment Model Profile</h2>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <RadarChart data={[
                  { label: 'Accuracy', value: health.sentimentModel.accuracy * 100 },
                  { label: 'Precision', value: health.sentimentModel.precision * 100 },
                  { label: 'Recall', value: health.sentimentModel.recall * 100 },
                  { label: 'F1', value: health.sentimentModel.f1 * 100 },
                  { label: 'Macro F1', value: health.sentimentModel.macroF1 * 100 },
                ]} />
              </div>
            </div>

            <div className="glass-card" style={{ padding: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1C1033', marginBottom: 20, margin: '0 0 20px' }}>Component Status</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {health.components.map(comp => (
                  <div key={comp.id} className="glass-secondary" style={{ padding: '12px 16px', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {statusIcon(comp.status)}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1C1033' }}>{comp.name}</div>
                        {comp.metric && comp.metricValue !== undefined && (
                          <div style={{ fontSize: 11, color: '#8B83A3' }}>
                            {comp.metric}: {comp.metricValue.toFixed(1)}%
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#8B83A3' }}>
                      <Zap size={10} />
                      {new Date(comp.lastChecked).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
