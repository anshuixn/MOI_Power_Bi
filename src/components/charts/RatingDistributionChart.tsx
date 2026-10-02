import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { useApp } from '@/hooks/useApp'
import { Star } from 'lucide-react'

gsap.registerPlugin(useGSAP)

interface RatingDistributionProps {
  data: { rating: number; count: number }[]
}

export function RatingDistributionChart({ data }: RatingDistributionProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { prefersReducedMotion } = useApp()
  
  const maxCount = Math.max(...data.map(d => d.count))
  
  useGSAP(() => {
    if (prefersReducedMotion) return
    const bars = containerRef.current?.querySelectorAll('.rating-bar-fill')
    if (!bars) return
    
    gsap.fromTo(bars, 
      { width: '0%' },
      {
        width: (i) => `${(data[i].count / maxCount) * 100}%`,
        duration: 1.0,
        stagger: 0.1,
        ease: 'power3.out'
      }
    )
  }, { dependencies: [data, maxCount, prefersReducedMotion] })
  
  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
      {data.map((item) => {
        const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0
        
        return (
          <div key={item.rating} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: 40, color: '#8B83A3', fontWeight: 600 }}>
              {item.rating} <Star size={14} fill="currentColor" />
            </div>
            <div style={{ flex: 1, height: 12, background: 'rgba(124,58,237,0.05)', borderRadius: 6, overflow: 'hidden' }}>
              <div 
                className="rating-bar-fill"
                style={{ 
                  height: '100%', 
                  background: 'linear-gradient(90deg, #A855F7 0%, #7C3AED 100%)', 
                  borderRadius: 6,
                  width: `${percentage}%` 
                }} 
              />
            </div>
            <div style={{ width: 40, textAlign: 'right', color: '#4B4466', fontSize: 13, fontWeight: 500 }}>
              {item.count}
            </div>
          </div>
        )
      })}
    </div>
  )
}
