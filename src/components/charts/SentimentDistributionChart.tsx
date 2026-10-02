// ============================================================
// Sentiment Distribution — Phase 6: CSS draw-on arc animation,
// animated count-up center, hover glow enhancement
// ============================================================

import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/hooks/useApp'

interface SentimentDistributionProps {
  positive: number
  neutral: number
  negative: number
  total: number
  size?: number
  strokeWidth?: number
}

const COLORS = {
  positive: '#10B981',
  neutral:  '#C4B5FD',
  negative: '#F87171',
}

// Animated number counter hook
function useCountUp(target: number, duration = 1200, enabled = true) {
  const [value, setValue] = useState(() => enabled ? 0 : target)
  const rafRef = useRef<number>(0)
  const startRef = useRef<number>(0)

  useEffect(() => {
    if (!enabled) return // Value is already set to target via initial state
    cancelAnimationFrame(rafRef.current)
    startRef.current = performance.now()
    const animate = (now: number) => {
      const elapsed = now - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const next = Math.round(eased * target)
      if (progress < 1) {
        setValue(next)
        rafRef.current = requestAnimationFrame(animate)
      } else {
        setValue(target)
      }
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration, enabled])

  return value
}

export function SentimentDistributionChart({
  positive,
  neutral,
  negative,
  total,
  size = 160,
  strokeWidth = 22,
}: SentimentDistributionProps) {
  const [hovered, setHovered] = useState<'pos' | 'neu' | 'neg' | null>(null)
  const [mounted, setMounted] = useState(false)
  const { prefersReducedMotion } = useApp()

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100)
    return () => clearTimeout(t)
  }, [])

  const animatedTotal = useCountUp(total, 1400, mounted && !prefersReducedMotion)

  const radius        = (size - strokeWidth) / 2
  const cx            = size / 2
  const cy            = size / 2
  const circumference = 2 * Math.PI * radius

  const posLen = (positive / 100) * circumference
  const neuLen = (neutral  / 100) * circumference
  const negLen = (negative / 100) * circumference

  const gap       = 4
  const effPosLen = Math.max(0, posLen - gap)
  const effNeuLen = Math.max(0, neuLen - gap)
  const effNegLen = Math.max(0, negLen - gap)

  const posOffset = circumference * 0.25
  const neuOffset = posOffset - posLen
  const negOffset = neuOffset - neuLen

  const isHovered = (id: 'pos' | 'neu' | 'neg') => hovered === id || hovered === null

  const strokeFor = (id: 'pos' | 'neu' | 'neg', activeWidth: number) =>
    hovered === id ? activeWidth + 3 : activeWidth


  return (
    <>
      <style>{`
        @keyframes rb-arc-draw {
          from { stroke-dashoffset: ${circumference}; }
          to   { stroke-dashoffset: 0; }
        }
        .rb-arc-animate {
          stroke-dasharray: ${circumference};
          stroke-dashoffset: ${circumference};
          animation: rb-arc-draw 1.2s cubic-bezier(0.25, 1, 0.5, 1) both;
        }
      `}</style>
      <div
        style={{
          position: 'relative',
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
        role="img"
        aria-label={`Sentiment: ${positive}% positive, ${neutral}% neutral, ${negative}% negative`}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: 'rotate(-90deg)' }}
        >
          <defs>
            <filter id="arc-glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Track */}
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="rgba(196,181,253,0.14)" strokeWidth={strokeWidth} />

          {/* Positive arc */}
          <circle
            cx={cx} cy={cy} r={radius}
            fill="none"
            stroke={COLORS.positive}
            strokeWidth={strokeFor('pos', strokeWidth)}
            strokeDasharray={`${effPosLen} ${circumference}`}
            strokeDashoffset={posOffset}
            strokeLinecap="round"
            className={mounted && !prefersReducedMotion ? 'rb-arc-animate' : undefined}
            style={{
              transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
              opacity: isHovered('pos') ? 1 : 0.25,
              filter: hovered === 'pos' ? 'url(#arc-glow)' : undefined,
              animationDelay: '0s',
            }}
            onMouseEnter={() => setHovered('pos')}
            onMouseLeave={() => setHovered(null)}
            cursor="pointer"
          />

          {/* Neutral arc */}
          <circle
            cx={cx} cy={cy} r={radius}
            fill="none"
            stroke={COLORS.neutral}
            strokeWidth={strokeFor('neu', strokeWidth)}
            strokeDasharray={`${effNeuLen} ${circumference}`}
            strokeDashoffset={neuOffset}
            strokeLinecap="round"
            className={mounted && !prefersReducedMotion ? 'rb-arc-animate' : undefined}
            style={{
              transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
              opacity: isHovered('neu') ? 1 : 0.25,
              filter: hovered === 'neu' ? 'url(#arc-glow)' : undefined,
              animationDelay: '0.1s',
            }}
            onMouseEnter={() => setHovered('neu')}
            onMouseLeave={() => setHovered(null)}
            cursor="pointer"
          />

          {/* Negative arc */}
          <circle
            cx={cx} cy={cy} r={radius}
            fill="none"
            stroke={COLORS.negative}
            strokeWidth={strokeFor('neg', strokeWidth)}
            strokeDasharray={`${effNegLen} ${circumference}`}
            strokeDashoffset={negOffset}
            strokeLinecap="round"
            className={mounted && !prefersReducedMotion ? 'rb-arc-animate' : undefined}
            style={{
              transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
              opacity: isHovered('neg') ? 1 : 0.25,
              filter: hovered === 'neg' ? 'url(#arc-glow)' : undefined,
              animationDelay: '0.2s',
            }}
            onMouseEnter={() => setHovered('neg')}
            onMouseLeave={() => setHovered(null)}
            cursor="pointer"
          />
        </svg>

        {/* Center text — animated count-up */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              fontSize: hovered ? 18 : 20,
              fontWeight: 700,
              color: hovered === 'pos' ? COLORS.positive : hovered === 'neg' ? COLORS.negative : hovered === 'neu' ? '#9333ea' : '#1C1033',
              lineHeight: 1.1,
              fontVariantNumeric: 'tabular-nums',
              transition: 'color 0.25s ease, font-size 0.2s ease',
            }}
          >
            {hovered === 'pos' ? `${positive.toFixed(1)}%`
              : hovered === 'neg' ? `${negative.toFixed(1)}%`
              : hovered === 'neu' ? `${neutral.toFixed(1)}%`
              : animatedTotal.toLocaleString()}
          </div>
          <div style={{ fontSize: 10, fontWeight: 500, color: '#8B83A3', marginTop: 2, transition: 'all 0.2s ease' }}>
            {hovered === 'pos' ? 'Positive' : hovered === 'neg' ? 'Negative' : hovered === 'neu' ? 'Neutral' : 'Total Reviews'}
          </div>
        </div>
      </div>
    </>
  )
}
