// ============================================================
// SVG Star Rating component
// ============================================================

interface StarRatingProps {
  rating: number        // 0–5
  maxStars?: number
  size?: number
  gap?: number
  className?: string
}

export function StarRating({ rating, maxStars = 5, size = 14, gap = 2 }: StarRatingProps) {
  return (
    <div
      role="img"
      aria-label={`${rating} out of ${maxStars} stars`}
      style={{ display: 'flex', alignItems: 'center', gap }}
    >
      {Array.from({ length: maxStars }).map((_, i) => {
        const fill = Math.max(0, Math.min(1, rating - i))
        const id = `star-clip-${rating.toFixed(2)}-${i}`
        return (
          <svg
            key={i}
            width={size}
            height={size}
            viewBox="0 0 16 16"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={id}>
                <stop offset={`${fill * 100}%`} stopColor="#FFC857" />
                <stop offset={`${fill * 100}%`} stopColor="#DDE4EE" />
              </linearGradient>
            </defs>
            <path
              d="M8 1.5l1.793 3.629 4.007.583-2.9 2.825.685 3.988L8 10.272l-3.585 1.253.685-3.988L2.2 5.712l4.007-.583L8 1.5z"
              fill={`url(#${id})`}
              stroke="#FFC857"
              strokeWidth="0.5"
              strokeLinejoin="round"
            />
          </svg>
        )
      })}
    </div>
  )
}
