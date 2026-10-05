// ============================================================
// ReviewBand Logo — Image Asset
// ============================================================

import logoImage from '@/assets/logo.jpg'

interface LogoProps {
  variant?: 'full' | 'mark'
  size?: number
  className?: string
}

const Mark = ({ size = 32 }: { size?: number }) => (
  <img 
    src={logoImage} 
    alt="ReviewBand Logo Mark" 
    width={size} 
    height={size} 
    style={{ objectFit: 'contain', borderRadius: '4px' }} 
    aria-hidden="true" 
  />
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
