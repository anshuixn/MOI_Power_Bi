// ============================================================
// Sentiment Trend Chart — Phase 6: GSAP draw-on, animated dots,
// glowing data points, smooth entrance
// ============================================================

import { useState, useRef, useCallback } from 'react'
import type { SentimentDataPoint } from '@/types'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { useApp } from '@/hooks/useApp'

gsap.registerPlugin(useGSAP)

interface TooltipData {
  x: number
  y: number
  datum: SentimentDataPoint
  idx: number
}

interface SentimentTrendProps {
  data: SentimentDataPoint[]
  width?: number
  height?: number
}

const PADDING = { top: 16, right: 16, bottom: 32, left: 40 }

const COLORS = {
  positive: '#10B981',
  neutral:  '#C4B5FD',
  negative: '#F87171',
}

function smoothPath(pts: Array<{ x: number; y: number }>): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1]
    const curr = pts[i]
    const cpx = (prev.x + curr.x) / 2
    d += ` C ${cpx} ${prev.y} ${cpx} ${curr.y} ${curr.x} ${curr.y}`
  }
  return d
}

function areaPath(pts: Array<{ x: number; y: number }>, bottom: number): string {
  const line = smoothPath(pts)
  if (!line) return ''
  return `${line} L ${pts[pts.length - 1].x} ${bottom} L ${pts[0].x} ${bottom} Z`
}

export function SentimentTrendChart({ data, width = 600, height = 200 }: SentimentTrendProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const posLineRef = useRef<SVGPathElement>(null)
  const neuLineRef = useRef<SVGPathElement>(null)
  const negLineRef = useRef<SVGPathElement>(null)
  const posAreaRef = useRef<SVGPathElement>(null)
  const neuAreaRef = useRef<SVGPathElement>(null)
  const negAreaRef = useRef<SVGPathElement>(null)
  const { prefersReducedMotion } = useApp()

  const W = width - PADDING.left - PADDING.right
  const H = height - PADDING.top - PADDING.bottom

  const maxY = 100
  const yTicks = [0, 25, 50, 75, 100]

  const xScale = useCallback((i: number) => (i / (data.length - 1)) * W + PADDING.left, [data.length, W])
  const yScale = useCallback((v: number) => PADDING.top + H - (v / maxY) * H, [H])

  const posPoints = data.map((d, i) => ({ x: xScale(i), y: yScale(d.positive) }))
  const neuPoints = data.map((d, i) => ({ x: xScale(i), y: yScale(d.neutral) }))
  const negPoints = data.map((d, i) => ({ x: xScale(i), y: yScale(d.negative) }))

  const xLabels = (() => {
    const step = Math.floor(data.length / 5)
    return [0, step, step * 2, step * 3, data.length - 1]
      .filter((i, idx, arr) => arr.indexOf(i) === idx && i < data.length)
      .map(i => ({
        i,
        label: new Date(data[i].date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      }))
  })()

  const chartBottom = PADDING.top + H

  // Phase 6: Draw-on animation using stroke-dashoffset trick
  useGSAP(() => {
    if (prefersReducedMotion) return
    const lines = [posLineRef.current, neuLineRef.current, negLineRef.current]
    const areas = [posAreaRef.current, neuAreaRef.current, negAreaRef.current]

    lines.forEach((el, i) => {
      if (!el) return
      const length = el.getTotalLength()
      gsap.set(el, { strokeDasharray: length, strokeDashoffset: length, opacity: 0 })
      gsap.to(el, {
        strokeDashoffset: 0,
        opacity: 1,
        duration: 1.4,
        delay: 0.1 + i * 0.12,
        ease: 'power2.inOut',
      })
    })

    areas.forEach((el, i) => {
      if (!el) return
      gsap.from(el, {
        opacity: 0,
        duration: 1.0,
        delay: 0.6 + i * 0.1,
        ease: 'power2.out',
      })
    })
  }, { dependencies: [data, prefersReducedMotion] })

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const relX = e.clientX - rect.left - PADDING.left
    const idx = Math.min(Math.max(Math.round((relX / W) * (data.length - 1)), 0), data.length - 1)
    const datum = data[idx]
    setTooltip({ x: xScale(idx), y: e.clientY - rect.top - 10, datum, idx })
  }, [data, W, xScale])

  // Active hover dot y positions
  const activeDots = tooltip ? [
    { y: yScale(tooltip.datum.positive), color: COLORS.positive, key: 'pos' },
    { y: yScale(tooltip.datum.neutral),  color: COLORS.neutral,  key: 'neu' },
    { y: yScale(tooltip.datum.negative), color: COLORS.negative, key: 'neg' },
  ] : []

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto', overflow: 'visible' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
        aria-label="Sentiment trend over 30 days"
        role="img"
      >
        <defs>
          {/* Positive — mint green */}
          <linearGradient id="rb-grad-pos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={COLORS.positive} stopOpacity="0.30" />
            <stop offset="100%" stopColor={COLORS.positive} stopOpacity="0.01" />
          </linearGradient>
          {/* Neutral — lavender */}
          <linearGradient id="rb-grad-neu" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={COLORS.neutral} stopOpacity="0.35" />
            <stop offset="100%" stopColor={COLORS.neutral} stopOpacity="0.01" />
          </linearGradient>
          {/* Negative — coral */}
          <linearGradient id="rb-grad-neg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={COLORS.negative} stopOpacity="0.22" />
            <stop offset="100%" stopColor={COLORS.negative} stopOpacity="0.01" />
          </linearGradient>
          {/* Glow filters */}
          <filter id="rb-glow-pos">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="rb-glow-neg">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Y gridlines */}
        {yTicks.map(tick => (
          <g key={tick}>
            <line
              x1={PADDING.left} y1={yScale(tick)}
              x2={PADDING.left + W} y2={yScale(tick)}
              stroke="rgba(196,181,253,0.15)"
              strokeWidth="1"
              strokeDasharray="3 5"
            />
            <text
              x={PADDING.left - 8} y={yScale(tick) + 4}
              textAnchor="end" fontSize="10"
              fill="#8B83A3"
              fontFamily="Inter Variable, Inter, system-ui, sans-serif"
            >
              {tick}%
            </text>
          </g>
        ))}

        {/* X axis labels */}
        {xLabels.map(({ i, label }) => (
          <text
            key={i}
            x={xScale(i)} y={chartBottom + 18}
            textAnchor="middle" fontSize="10"
            fill="#8B83A3"
            fontFamily="Inter Variable, Inter, system-ui, sans-serif"
          >
            {label}
          </text>
        ))}

        {/* Area fills */}
        <path ref={negAreaRef} d={areaPath(negPoints, chartBottom)} fill="url(#rb-grad-neg)" />
        <path ref={neuAreaRef} d={areaPath(neuPoints, chartBottom)} fill="url(#rb-grad-neu)" />
        <path ref={posAreaRef} d={areaPath(posPoints, chartBottom)} fill="url(#rb-grad-pos)" />

        {/* Lines — positive on top with glow */}
        <path ref={negLineRef} d={smoothPath(negPoints)} fill="none" stroke={COLORS.negative} strokeWidth="1.75" strokeLinecap="round" />
        <path ref={neuLineRef} d={smoothPath(neuPoints)} fill="none" stroke={COLORS.neutral}  strokeWidth="1.75" strokeLinecap="round" />
        <path ref={posLineRef} d={smoothPath(posPoints)} fill="none" stroke={COLORS.positive} strokeWidth="2.5"  strokeLinecap="round" filter="url(#rb-glow-pos)" />

        {/* Hover crosshair */}
        {tooltip && (
          <line
            x1={tooltip.x} y1={PADDING.top}
            x2={tooltip.x} y2={chartBottom}
            stroke="#7C3AED" strokeWidth="1" strokeDasharray="3 3" opacity="0.3"
          />
        )}

        {/* Hover glow dots */}
        {tooltip && activeDots.map(dot => (
          <g key={dot.key}>
            {/* Outer glow ring */}
            <circle cx={tooltip.x} cy={dot.y} r={7} fill={dot.color} opacity={0.15} />
            {/* Inner dot */}
            <circle cx={tooltip.x} cy={dot.y} r={4} fill={dot.color} stroke="white" strokeWidth="1.5" />
          </g>
        ))}
      </svg>

      {/* Glassmorphic Tooltip */}
      {tooltip && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'absolute',
            left: Math.min(tooltip.x, width - 160),
            top: Math.max(8, tooltip.y - 90),
            background: 'rgba(255,255,255,0.94)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(196,181,253,0.35)',
            borderRadius: 14,
            padding: '10px 14px',
            boxShadow: '0 8px 32px rgba(124,58,237,0.12), inset 0 1px 1px rgba(255,255,255,0.9)',
            pointerEvents: 'none',
            zIndex: 10,
            minWidth: 148,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: '#8B83A3', marginBottom: 8 }}>
            {new Date(tooltip.datum.date).toLocaleDateString('en', { month: 'long', day: 'numeric' })}
          </div>
          {([
            { label: 'Positive', value: tooltip.datum.positive, color: COLORS.positive },
            { label: 'Neutral',  value: tooltip.datum.neutral,  color: COLORS.neutral },
            { label: 'Negative', value: tooltip.datum.negative, color: COLORS.negative },
          ] as const).map(row => (
            <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: row.color }} />
                <span style={{ fontSize: 12, color: '#4B4466' }}>{row.label}</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#1C1033', fontVariantNumeric: 'tabular-nums' }}>
                {row.value.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
