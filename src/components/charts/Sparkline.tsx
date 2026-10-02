// ============================================================
// Sparkline — Phase 6: draw-on animation + glowing end dot
// ============================================================

import { useRef, useEffect } from 'react'

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  strokeWidth?: number
}

export function Sparkline({ data, width = 80, height = 28, color = '#2E9E73', strokeWidth = 1.5 }: SparklineProps) {
  const lineRef = useRef<SVGPathElement>(null)
  
  const dataDeps = data.join(',')

  // Draw-on animation
  useEffect(() => {
    if (data.length < 2) return
    const el = lineRef.current
    if (!el) return
    const length = el.getTotalLength()
    el.style.strokeDasharray = `${length}`
    el.style.strokeDashoffset = `${length}`
    el.style.transition = 'stroke-dashoffset 0.9s cubic-bezier(0.25, 1, 0.5, 1) 0.1s'
    requestAnimationFrame(() => {
      el.style.strokeDashoffset = '0'
    })
  }, [dataDeps, data.length])

  if (data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - ((v - min) / range) * height * 0.80 - height * 0.1,
  }))

  const path = pts.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`
    const prev = pts[i - 1]
    const cpx = (prev.x + pt.x) / 2
    return `${acc} C ${cpx} ${prev.y} ${cpx} ${pt.y} ${pt.x} ${pt.y}`
  }, '')

  const areaPath = `${path} L ${pts[pts.length - 1].x} ${height} L ${pts[0].x} ${height} Z`

  // Last point for the glow dot
  const lastPt = pts[pts.length - 1]

  const gradId = `sg-${color.replace(/[^a-z0-9]/gi, '')}`

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0.00" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <path d={areaPath} fill={`url(#${gradId})`} />
      {/* Animated line */}
      <path
        ref={lineRef}
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Glowing end dot */}
      <circle cx={lastPt.x} cy={lastPt.y} r={3.5} fill={color} opacity={0.2} />
      <circle cx={lastPt.x} cy={lastPt.y} r={2}   fill={color} />
    </svg>
  )
}
