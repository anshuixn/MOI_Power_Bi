// ============================================================
// Top Topics Chart — Phase 6: Staggered GSAP bar growth animation,
// shimmer effect, premium hover interactions
// ============================================================

import { useRef } from 'react'
import type { Topic } from '@/types'
import { Package, Truck, Headset, Tag, Zap, MessageSquare } from 'lucide-react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { useApp } from '@/hooks/useApp'

gsap.registerPlugin(useGSAP)

interface TopTopicsProps {
  topics: Topic[]
  totalReviews: number
}

function getIcon(name: string) {
  const n = name.toLowerCase()
  if (n.includes('quality'))                       return <Package  size={13} />
  if (n.includes('delivery'))                      return <Truck    size={13} />
  if (n.includes('support'))                       return <Headset  size={13} />
  if (n.includes('price') || n.includes('pricing')) return <Tag   size={13} />
  if (n.includes('feature'))                       return <Zap     size={13} />
  return <MessageSquare size={13} />
}

const BAR_GRADIENTS = [
  'linear-gradient(90deg, #10B981, #34D399)',   // #1 — mint
  'linear-gradient(90deg, #059669, #10B981)',   // #2 — deep mint
  'linear-gradient(90deg, #7C3AED, #A855F7)',   // #3 — purple
  'linear-gradient(90deg, #A855F7, #C4B5FD)',   // #4 — lavender
  'linear-gradient(90deg, #C4B5FD, #DDD6FE)',   // #5 — pale lavender
]

const ICON_STYLES = [
  { bg: 'rgba(16,185,129,0.12)', color: '#059669' },
  { bg: 'rgba(16,185,129,0.10)', color: '#10B981' },
  { bg: 'rgba(124,58,237,0.12)', color: '#7C3AED' },
  { bg: 'rgba(168,85,247,0.12)', color: '#A855F7' },
  { bg: 'rgba(196,181,253,0.18)', color: '#7C3AED' },
]

export function TopTopicsChart({ topics, totalReviews }: TopTopicsProps) {
  const { prefersReducedMotion } = useApp()
  const containerRef = useRef<HTMLDivElement>(null)
  const display = topics.slice(0, 5)
  const maxPct  = Math.max(...display.map(t => (t.mentions / totalReviews) * 100), 1)

  // Phase 6: GSAP staggered bar growth
  useGSAP(() => {
    if (prefersReducedMotion || !containerRef.current) return
    gsap.from('.rb-topic-bar', {
      scaleX: 0,
      transformOrigin: 'left center',
      duration: 0.9,
      stagger: 0.08,
      delay: 0.1,
      ease: 'power3.out',
    })
    gsap.from('.rb-topic-row', {
      x: -12,
      opacity: 0,
      duration: 0.5,
      stagger: 0.06,
      delay: 0.05,
      ease: 'power2.out',
    })
  }, { dependencies: [topics, prefersReducedMotion], scope: containerRef })

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {display.map((topic, i) => {
        const pct    = (topic.mentions / totalReviews) * 100
        const barPct = (pct / maxPct) * 100
        const iconStyle = ICON_STYLES[i] ?? ICON_STYLES[4]

        return (
          <div
            key={topic.id}
            className="rb-topic-row"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'default',
              transition: 'opacity 0.2s ease',
            }}
          >
            {/* Rank */}
            <div
              style={{
                width: 16,
                fontSize: 10,
                fontWeight: 700,
                color: '#C4B5FD',
                textAlign: 'center',
                flexShrink: 0,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {i + 1}
            </div>

            {/* Icon chip */}
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                background: iconStyle.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: iconStyle.color,
                flexShrink: 0,
              }}
            >
              {getIcon(topic.name)}
            </div>

            {/* Label */}
            <div
              style={{
                width: 100,
                fontSize: 12,
                fontWeight: 500,
                color: '#1C1033',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flexShrink: 0,
              }}
            >
              {topic.name}
            </div>

            {/* Bar track */}
            <div
              style={{
                flex: 1,
                height: 7,
                background: 'rgba(196,181,253,0.14)',
                borderRadius: 999,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                className="rb-topic-bar"
                style={{
                  height: '100%',
                  width: `${barPct}%`,
                  background: BAR_GRADIENTS[i] ?? BAR_GRADIENTS[4],
                  borderRadius: 999,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Shimmer overlay */}
                <div
                  aria-hidden="true"
                  className="rb-topic-shimmer"
                  style={{
                    position: 'absolute',
                    top: 0, bottom: 0, width: '50%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                    transform: 'skewX(-20deg)',
                    animation: `rb-shimmer ${1.2 + i * 0.1}s ${0.3 + i * 0.08}s ease forwards`,
                    opacity: 0,
                  }}
                />
              </div>
            </div>

            {/* Percentage */}
            <div
              style={{
                width: 38,
                textAlign: 'right',
                fontSize: 12,
                fontWeight: 700,
                color: '#4B4466',
                fontVariantNumeric: 'tabular-nums',
                flexShrink: 0,
              }}
            >
              {pct.toFixed(1)}%
            </div>
          </div>
        )
      })}

      <style>{`
        @keyframes rb-shimmer {
          0%   { left: -60%; opacity: 0.8; }
          100% { left: 130%; opacity: 0; }
        }
        .rb-topic-shimmer {
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}
