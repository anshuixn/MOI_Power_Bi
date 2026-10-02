// ============================================================
// Interactive Botanical Glass Environment (Layer 2)
// Premium Glassmorphism, Cursor Physics & Parallax
// ============================================================

import { useEffect, useRef } from 'react'
import { useApp } from '@/hooks/useApp'

// ── Types & Data ──

type BotanicalType = 'tree' | 'branch' | 'leaf-cluster' | 'petal' | 'flower'

interface BotanicalElement {
  id: string
  type: BotanicalType
  x: number // Viewport % (0-100)
  y: number // Viewport % (0-100)
  scale: number
  rotation: number
  depth: number // 0 (front) to 1 (far back)
  colorRange: 'mint' | 'lavender' | 'peach' | 'sage' | 'white'
  paths: string[] // SVG paths
}

// Pre-defined elegant paths
const PATHS = {
  leaf1: 'M0,0 C20,-30 60,-40 80,-10 C90,20 50,40 0,0 Z',
  leaf2: 'M0,0 C-20,-40 -10,-70 20,-80 C50,-90 60,-40 0,0 Z',
  leaf3: 'M0,0 C30,10 50,40 30,70 C10,90 -20,60 0,0 Z',
  stem1: 'M0,0 Q-20,50 -10,100 T20,200',
  stem2: 'M0,0 Q30,60 10,120 T-20,200',
  petal: 'M0,0 C20,-20 40,-10 30,10 C20,30 -10,20 0,0 Z',
  flower: 'M0,-10 C20,-30 40,0 20,20 C0,40 -20,20 -40,0 C-20,-20 0,-30 0,-10 Z',
}

// Composition data
const ELEMENTS: BotanicalElement[] = [
  // Far Background (Trees/Large Branches)
  { id: 'tree-bl', type: 'tree', x: -5, y: 80, scale: 3.5, rotation: 15, depth: 0.9, colorRange: 'sage', paths: [PATHS.stem1, PATHS.leaf1, PATHS.leaf2] },
  { id: 'branch-tr', type: 'branch', x: 95, y: 10, scale: 2.8, rotation: -135, depth: 0.8, colorRange: 'lavender', paths: [PATHS.stem2, PATHS.leaf3, PATHS.leaf1] },
  
  // Mid Background (Leaf clusters behind UI)
  { id: 'cluster-cl', type: 'leaf-cluster', x: 15, y: 40, scale: 1.8, rotation: 45, depth: 0.5, colorRange: 'mint', paths: [PATHS.leaf1, PATHS.leaf3] },
  { id: 'cluster-cr', type: 'leaf-cluster', x: 85, y: 60, scale: 2.0, rotation: -20, depth: 0.6, colorRange: 'peach', paths: [PATHS.leaf2, PATHS.leaf1] },
  { id: 'flower-tc', type: 'flower', x: 60, y: 5, scale: 2.2, rotation: 0, depth: 0.7, colorRange: 'lavender', paths: [PATHS.flower, PATHS.leaf2] },
  
  // Foreground (Petals and small leaves)
  { id: 'petal-1', type: 'petal', x: 25, y: 25, scale: 1.2, rotation: 75, depth: 0.2, colorRange: 'white', paths: [PATHS.petal] },
  { id: 'petal-2', type: 'petal', x: 75, y: 85, scale: 1.5, rotation: -45, depth: 0.1, colorRange: 'lavender', paths: [PATHS.petal] },
  { id: 'leaf-f1', type: 'leaf-cluster', x: 40, y: 90, scale: 1.0, rotation: 110, depth: 0.3, colorRange: 'mint', paths: [PATHS.leaf3] },
]

export function BackgroundOrganic() {
  const { prefersReducedMotion } = useApp()
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Interactive Physics Engine
  useEffect(() => {
    if (prefersReducedMotion || !containerRef.current) return
    
    const container = containerRef.current
    const elements = Array.from(container.querySelectorAll('.botanical-el')) as HTMLElement[]
    
    let mouseX = window.innerWidth / 2
    let mouseY = window.innerHeight / 2
    let targetX = mouseX
    let targetY = mouseY
    
    // For smooth ambient drift
    let time = 0

    const handleMouseMove = (e: MouseEvent) => {
      targetX = e.clientX
      targetY = e.clientY
      
      // Update global CSS variables for the light field
      container.style.setProperty('--cursor-x', `${e.clientX}px`)
      container.style.setProperty('--cursor-y', `${e.clientY}px`)
    }

    window.addEventListener('mousemove', handleMouseMove)
    
    let rafId: number
    
    const render = () => {
      time += 0.01
      
      // LERP mouse position for smooth physics
      mouseX += (targetX - mouseX) * 0.08
      mouseY += (targetY - mouseY) * 0.08

      const cx = window.innerWidth / 2
      const cy = window.innerHeight / 2
      
      // Parallax offsets (from center of screen)
      const px = (mouseX - cx)
      const py = (mouseY - cy)

      elements.forEach(el => {
        const depth = parseFloat(el.dataset.depth || '0.5')
        const baseX = parseFloat(el.dataset.x || '0')
        const baseY = parseFloat(el.dataset.y || '0')
        const baseRot = parseFloat(el.dataset.rot || '0')
        
        // Element's screen position (approximate center for physics)
        const elX = (baseX / 100) * window.innerWidth
        const elY = (baseY / 100) * window.innerHeight
        
        // Distance from cursor to element
        const dx = mouseX - elX
        const dy = mouseY - elY
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        // ── Cursor Proximity Repulsion (Glass Physics) ──
        // Closer = stronger repulsion. Larger depth (far away) = less repulsion.
        const influenceRadius = 400
        let repulsionX = 0
        let repulsionY = 0
        let tiltRot = 0
        
        if (dist < influenceRadius) {
          const force = Math.pow(1 - dist / influenceRadius, 2) // Ease out quad
          const depthMultiplier = (1 - depth) // Front elements react more
          
          repulsionX = -(dx / dist) * force * 40 * depthMultiplier
          repulsionY = -(dy / dist) * force * 40 * depthMultiplier
          tiltRot = (dx / dist) * force * 15 * depthMultiplier
        }
        
        // ── Parallax ──
        // Far objects move slower
        const pForce = (1 - depth) * 0.05
        const parallaxX = px * -pForce
        const parallaxY = py * -pForce
        
        // ── Ambient Drift (Wind) ──
        // Distant objects drift slower, foreground faster
        const ambientX = Math.sin(time + baseX) * (15 * (1 - depth))
        const ambientY = Math.cos(time + baseY) * (10 * (1 - depth))
        const ambientRot = Math.sin(time * 0.5 + baseX) * (5 * (1 - depth))

        // Combine transforms
        const finalX = parallaxX + repulsionX + ambientX
        const finalY = parallaxY + repulsionY + ambientY
        const finalRot = baseRot + tiltRot + ambientRot

        el.style.transform = `translate(${finalX}px, ${finalY}px) rotate(${finalRot}deg)`
      })

      rafId = requestAnimationFrame(render)
    }
    
    rafId = requestAnimationFrame(render)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(rafId)
    }
  }, [prefersReducedMotion])

  // Map colors to premium glassmorphism gradients
  const getFillUrl = (color: string) => {
    switch (color) {
      case 'mint': return 'url(#glass-mint)'
      case 'lavender': return 'url(#glass-lavender)'
      case 'peach': return 'url(#glass-peach)'
      case 'sage': return 'url(#glass-sage)'
      case 'white': return 'url(#glass-white)'
      default: return 'url(#glass-lavender)'
    }
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        pointerEvents: 'none',
        overflow: 'hidden',
        // Provide a default fallback for cursor position
        '--cursor-x': '50vw',
        '--cursor-y': '50vh',
      } as React.CSSProperties}
      aria-hidden="true"
    >
      <svg
        width="100%"
        height="100%"
        style={{ position: 'absolute', top: 0, left: 0 }}
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Glassmorphic Material Gradients */}
          {/* We use the cursor highlight inside these gradients if supported, 
              but SVG doesn't easily support external CSS variables for cx/cy in pure radialGradients inside defs.
              Instead, we will use a global lighting overlay or use standard gradients for the base and a CSS mask for the light.
          */}
          <linearGradient id="glass-mint" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A7F3D0" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="glass-lavender" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E9DFFF" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="glass-peach" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FBCFE8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="glass-sage" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D1FAE5" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="glass-white" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#FDFBFF" stopOpacity="0.2" />
          </linearGradient>

          <filter id="blur-far" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="16" />
          </filter>
          <filter id="blur-mid" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <filter id="blur-near" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" />
          </filter>
        </defs>

        {/* Global Cursor Light Field Layer */}
        {/* This creates a soft lavender highlight on objects underneath by using mix-blend-mode */}
        <rect 
          width="100%" 
          height="100%" 
          fill="url(#cursor-light)" 
          style={{ mixBlendMode: 'overlay', opacity: 0.6 }} 
        />
        <defs>
          <radialGradient id="cursor-light" cx="var(--cursor-x)" cy="var(--cursor-y)" r="300" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#C4B5FD" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#A78BFA" stopOpacity="0.1" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>

      {/* Render HTML elements for easier independent CSS transforms */}
      {ELEMENTS.map(el => {
        // Determine blur based on depth
        let filter = 'blur(2px)'
        if (el.depth > 0.7) filter = 'blur(16px)'
        else if (el.depth > 0.4) filter = 'blur(6px)'

        return (
          <div
            key={el.id}
            className="botanical-el"
            data-depth={el.depth}
            data-x={el.x}
            data-y={el.y}
            data-rot={el.rotation}
            style={{
              position: 'absolute',
              left: `${el.x}vw`,
              top: `${el.y}vh`,
              width: 0,
              height: 0,
              // Will be overridden by RAF, but set initial state
              transform: `rotate(${el.rotation}deg)`,
              willChange: 'transform',
            }}
          >
            {/* The SVG container for the individual botanical element */}
            <svg
              width={200 * el.scale}
              height={200 * el.scale}
              style={{
                position: 'absolute',
                top: -100 * el.scale,
                left: -100 * el.scale,
                opacity: 0.85,
                // Soft drop shadow to enhance glass layers
                filter: `${filter} drop-shadow(0 12px 24px rgba(124,58,237,0.15))`,
              }}
              viewBox="-100 -100 200 200"
            >
              <g>
                {el.paths.map((pathStr, idx) => {
                  const isStem = pathStr.includes('Q') || pathStr.includes('T') // Basic heuristic
                  return (
                    <path
                      key={idx}
                      d={pathStr}
                      fill={isStem ? 'none' : getFillUrl(el.colorRange)}
                      stroke={isStem ? getFillUrl(el.colorRange) : 'rgba(255,255,255,0.4)'}
                      strokeWidth={isStem ? 4 : 1}
                    />
                  )
                })}
                
                {/* Overlay highlight that responds to the global light field (using CSS mask/blend trick) */}
                {/* Since standard SVG is tricky here, we let the parent glassmorphism layers handle it or standard fill */}
              </g>
            </svg>
          </div>
        )
      })}
    </div>
  )
}
