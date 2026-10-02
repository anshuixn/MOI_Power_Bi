// ============================================================
// ReviewBand Logo — Purple glassmorphism reference design
// ============================================================

interface LogoProps {
  variant?: 'full' | 'mark'
  size?: number
  className?: string
}

const Mark = ({ size = 32 }: { size?: number }) => (
  <svg
    width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      {/* Outer ring track */}
      <circle cx="16" cy="16" r="13" stroke="rgba(196,181,253,0.30)" strokeWidth="2.5" fill="none" />
      {/* Segment 1 — purple */}
      <path d="M16 3A13 13 0 0 1 27.3 9"   stroke="#7C3AED" strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* Segment 2 — lavender */}
      <path d="M27.3 9A13 13 0 0 1 27.3 23" stroke="#A855F7" strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* Segment 3 — mint */}
      <path d="M27.3 23A13 13 0 0 1 16 29"  stroke="#10B981" strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* Segment 4 — light lavender */}
      <path d="M16 29A13 13 0 0 1 4.7 23"   stroke="#C4B5FD" strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* Segment 5 — coral */}
      <path d="M4.7 23A13 13 0 0 1 16 3"    stroke="#F87171" strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* Inner core */}
      <circle cx="16" cy="16" r="5" fill="rgba(124,58,237,0.12)" />
      <circle cx="16" cy="16" r="3" fill="#7C3AED" opacity="0.90" />
    </svg>
  )

export function ReviewBandLogo({ variant = 'full', size = 32, className = '' }: LogoProps) {
  if (variant === 'mark') {
    return <Mark size={size} />
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Mark size={size} />
      <span
        style={{
          fontFamily: 'Inter Variable, Inter, system-ui, sans-serif',
          fontSize: size * 0.55,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: '#1C1033',
          lineHeight: 1,
        }}
      >
        Review<span style={{ color: '#7C3AED' }}>Band</span>
      </span>
    </div>
  )
}
