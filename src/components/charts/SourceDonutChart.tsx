import { useState, useRef, useMemo } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { useApp } from '@/hooks/useApp'

gsap.registerPlugin(useGSAP)

interface SourceDonutProps {
  data: { source: string; value: number; color: string }[]
  width?: number
  height?: number
}

export function SourceDonutChart({ data, width = 300, height = 300 }: SourceDonutProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  const { prefersReducedMotion } = useApp()
  const svgRef = useRef<SVGSVGElement>(null)
  
  const cx = width / 2
  const cy = height / 2
  const radius = Math.min(width, height) / 2 - 20
  const strokeWidth = 30
  
  const total = useMemo(() => data.reduce((acc, curr) => acc + curr.value, 0), [data])
  
  let currentAngle = -Math.PI / 2
  
  const arcs = data.map((d, i) => {
    const angle = (d.value / total) * (2 * Math.PI)
    const x1 = cx + radius * Math.cos(currentAngle)
    const y1 = cy + radius * Math.sin(currentAngle)
    const x2 = cx + radius * Math.cos(currentAngle + angle)
    const y2 = cy + radius * Math.sin(currentAngle + angle)
    
    const largeArcFlag = angle > Math.PI ? 1 : 0
    const dPath = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`
    
    const pathLength = angle * radius
    
    currentAngle += angle
    return { ...d, dPath, pathLength, angle, index: i }
  })
  
  useGSAP(() => {
    if (prefersReducedMotion) return
    const paths = svgRef.current?.querySelectorAll('path.donut-segment')
    if (!paths) return
    
    paths.forEach((p, i) => {
      const length = (p as SVGPathElement).getTotalLength()
      gsap.set(p, { strokeDasharray: length, strokeDashoffset: length })
      gsap.to(p, {
        strokeDashoffset: 0,
        duration: 1.2,
        delay: i * 0.15,
        ease: 'power3.out'
      })
    })
  }, { dependencies: [data, prefersReducedMotion] })
  
  return (
    <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto', maxWidth: width, overflow: 'visible' }}
      >
        <defs>
          <filter id="donut-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="rgba(0,0,0,0.15)" />
          </filter>
        </defs>
        {arcs.map((arc) => (
          <path
            key={arc.source}
            className="donut-segment"
            d={arc.dPath}
            fill="none"
            stroke={arc.color}
            strokeWidth={hovered === arc.index ? strokeWidth + 6 : strokeWidth}
            strokeLinecap="round"
            filter={hovered === arc.index ? "url(#donut-shadow)" : undefined}
            style={{ 
              transition: 'stroke-width 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)', 
              cursor: 'pointer' 
            }}
            onMouseEnter={() => setHovered(arc.index)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
        {hovered !== null && (
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="24"
            fontWeight="bold"
            fill="#1C1033"
            style={{ pointerEvents: 'none' }}
          >
            {Math.round((arcs[hovered].value / total) * 100)}%
          </text>
        )}
        {hovered !== null && (
          <text
            x={cx}
            y={cy + 24}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="12"
            fill="#8B83A3"
            style={{ pointerEvents: 'none' }}
          >
            {arcs[hovered].source}
          </text>
        )}
      </svg>
    </div>
  )
}
