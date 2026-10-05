// ============================================================
// KPI Card — Phase 6: Animated count-up value, hover glow lift,
// premium glassmorphism micro-interactions
// ============================================================

import { useEffect, useRef, useState } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Sparkline } from '@/components/charts/Sparkline'
import { StarRating } from '@/components/charts/StarRating'
import type { KPICard as KPICardType } from '@/types'
import { useApp } from '@/hooks/useApp'

interface KPICardProps {
  kpi: KPICardType
  color?: string
  icon?: any
}

// Animated number count-up hook (Phase 6)
function useCountUp(
  formattedValue: string,
  rawValue: number,
  duration = 1000,
  enabled = true
) {
  const [displayed, setDisplayed] = useState(enabled ? '—' : formattedValue)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    cancelAnimationFrame(rafRef.current)

    if (!enabled) return // No animation: initial state is already the formattedValue

    const start = performance.now()
    const isPercentage = formattedValue.endsWith('%')
    const hasK = formattedValue.toLowerCase().includes('k')
    const hasDecimal = !Number.isInteger(rawValue)

    const animate = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = eased * rawValue

      let display: string
      if (hasK && current >= 1000) {
        display = (current / 1000).toFixed(1) + 'k'
      } else if (isPercentage) {
        display = current.toFixed(1) + '%'
      } else if (hasDecimal) {
        display = current.toFixed(1)
      } else {
        display = Math.round(current).toLocaleString()
      }

      if (progress < 1) {
        setDisplayed(display)
        rafRef.current = requestAnimationFrame(animate)
      } else {
        setDisplayed(formattedValue)
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)

  }, [rawValue, duration, enabled, formattedValue])

  return displayed
}

function DeltaBadge({ delta }: { delta: KPICardType['delta'] }) {
  const Icon =
    delta.direction === 'up'   ? TrendingUp :
    delta.direction === 'down' ? TrendingDown :
    Minus

  const color = delta.isPositive ? '#059669' : '#EF4444'
  const bg    = delta.isPositive ? 'rgba(16,185,129,0.10)' : 'rgba(248,113,113,0.12)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 8px',
          borderRadius: 999,
          background: bg,
          fontSize: 11,
          fontWeight: 700,
          color,
          fontVariantNumeric: 'tabular-nums',
          width: 'fit-content',
        }}
      >
        <Icon size={11} strokeWidth={2.5} />
        {delta.direction === 'up' ? '+' : ''}
        {delta.pct.toFixed(1)}%
      </div>
      <span style={{ fontSize: 10, color: '#8B83A3', lineHeight: 1.2 }}>
        {delta.comparisonLabel}
      </span>
    </div>
  )
}

export function KPICardComponent({ kpi, color = '#7C3AED', icon: Icon }: KPICardProps) {
  const { prefersReducedMotion } = useApp()
  const isRating = kpi.id === 'avg-rating'
  const [hovered, setHovered] = useState(false)

  const animatedValue = useCountUp(
    kpi.formattedValue,
    kpi.value,
    900,
    !prefersReducedMotion
  )

  return (
    <article
      aria-label={`${kpi.label}: ${kpi.formattedValue}`}
      className="glass-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '16px 18px',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        transition: 'box-shadow 0.25s ease, transform 0.25s ease',
        cursor: 'default',
        transform: hovered && !prefersReducedMotion ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hovered
          ? `0 12px 40px rgba(0,0,0,0.08), 0 4px 16px ${color}20, inset 0 1px 1px rgba(255,255,255,0.95)`
          : undefined,
      }}
    >
      {/* Accent color top strip (subtle) */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: 2,
          background: `linear-gradient(90deg, ${color}60, transparent)`,
          borderRadius: '20px 20px 0 0',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.25s ease',
        }}
      />

      {/* Header row: icon + label + sparkline */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {Icon && (
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: `${color}18`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'background 0.2s ease',
                ...(hovered ? { background: `${color}28` } : {}),
              }}
            >
              {typeof Icon === 'string' ? (
                <img
                  src={Icon}
                  alt=""
                  style={{
                    width: 20,
                    height: 20,
                    objectFit: 'contain',
                    display: 'block',
                  }}
                />
              ) : (
                <Icon size={15} strokeWidth={1.75} style={{ color }} />
              )}
            </div>
          )}
          <span style={{ fontSize: 12, fontWeight: 500, color: '#8B83A3' }}>
            {kpi.label}
          </span>
        </div>
        <Sparkline data={kpi.sparkline} width={68} height={24} color={color} />
      </div>

      {/* Big animated value */}
      <div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: '#1C1033',
            lineHeight: 1,
            letterSpacing: '-0.03em',
            fontVariantNumeric: 'tabular-nums',
            transition: 'color 0.2s ease',
          }}
        >
          {animatedValue}
          {kpi.unit && (
            <span style={{ fontSize: 14, fontWeight: 400, color: '#8B83A3', marginLeft: 4 }}>
              {kpi.unit}
            </span>
          )}
        </div>
        {isRating && (
          <div style={{ marginTop: 6 }}>
            <StarRating rating={kpi.value} size={13} gap={2} />
          </div>
        )}
      </div>

      {/* Delta badge */}
      <DeltaBadge delta={kpi.delta} />
    </article>
  )
}

// ── Skeleton ──────────────────────────────────────────────────
export function KPICardSkeleton() {
  return (
    <div
      className="glass-card"
      style={{
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
      aria-hidden="true"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 10 }} />
        <div className="skeleton" style={{ width: 90, height: 12, borderRadius: 6 }} />
      </div>
      <div className="skeleton" style={{ width: 120, height: 28, borderRadius: 8 }} />
      <div className="skeleton" style={{ width: 72, height: 20, borderRadius: 999 }} />
    </div>
  )
}
