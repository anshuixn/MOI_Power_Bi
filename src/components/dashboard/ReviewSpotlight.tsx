// ============================================================
// Review Spotlight — Purple glassmorphism reference design
// ============================================================

import { StarRating } from '@/components/charts/StarRating'
import type { Review } from '@/types'

interface ReviewSpotlightProps {
  review: Review | null
}

const TAG_STYLES: Record<string, { bg: string; color: string }> = {
  Negative:   { bg: 'rgba(248,113,113,0.12)', color: '#EF4444' },
  Delivery:   { bg: 'rgba(196,181,253,0.20)', color: '#7C3AED' },
  Packaging:  { bg: 'rgba(196,181,253,0.15)', color: '#7C3AED' },
  Positive:   { bg: 'rgba(16,185,129,0.12)',  color: '#059669' },
  Quality:    { bg: 'rgba(16,185,129,0.12)',  color: '#059669' },
}

function Tag({ label }: { label: string }) {
  const s = TAG_STYLES[label] ?? { bg: 'rgba(196,181,253,0.15)', color: '#7C3AED' }
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: s.color,
        background: s.bg,
        padding: '3px 10px',
        borderRadius: 999,
        border: `1px solid ${s.color}22`,
      }}
    >
      {label}
    </span>
  )
}

export function ReviewSpotlight({ review }: ReviewSpotlightProps) {
  if (!review) return null

  const sentiment = review.sentiment.label
  const tags = [
    sentiment.charAt(0).toUpperCase() + sentiment.slice(1),
    'Delivery',
    'Packaging',
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Quote mark */}
      <div
        style={{
          fontSize: 32,
          fontWeight: 900,
          color: 'rgba(196,181,253,0.50)',
          lineHeight: 1,
          marginBottom: -8,
          fontFamily: 'Georgia, serif',
        }}
      >
        "
      </div>

      {/* Review text */}
      <p
        style={{
          fontSize: 13,
          color: '#1C1033',
          lineHeight: 1.55,
          fontWeight: 400,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical' as const,
          overflow: 'hidden',
        }}
      >
        {review.text}
      </p>

      {/* Tags */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
        {tags.map(tag => (
          <Tag key={tag} label={tag} />
        ))}
      </div>

      {/* Stars + confidence */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <StarRating rating={review.rating} size={14} />
        <span
          style={{
            fontSize: 11,
            color: '#8B83A3',
            fontWeight: 500,
            background: 'rgba(196,181,253,0.12)',
            padding: '2px 8px',
            borderRadius: 999,
          }}
        >
          Confidence {Math.round(review.sentiment.confidence * 100)}%
        </span>
      </div>
    </div>
  )
}
