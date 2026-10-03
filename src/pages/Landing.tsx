// ============================================================
// ReviewBand — Cinematic AI Landing Page
// Premium scroll experience with:
// • 7-phase AI orb choreography driven by scroll progress
// • Natural floating card entrance (no PowerPoint-style animation)
// • Scroll-velocity physics with damping
// • Cursor-reactive hero
// • Cinematic workspace transition via orb light-gather effect
// • Fully accessible: prefers-reduced-motion respected
// ============================================================

import { useRef, useEffect, Suspense, lazy, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import {
  ArrowRight, Sparkles, BarChart3, Brain, Zap,
  Star, TrendingUp, Shield, ChevronDown
} from 'lucide-react'

import { useApp } from '@/hooks/useApp'
import {
  BASELINE_ACTIVE_COMPLAINTS,
  BASELINE_AVERAGE_RATING,
  BASELINE_SENTIMENT,
  BASELINE_TOTAL_REVIEWS,
  REVIEWS,
} from '@/data/mockData'

const LandingScene3D = lazy(() =>
  import('@/components/three/LandingScene3D').then(m => ({ default: m.LandingScene3D }))
)

gsap.registerPlugin(ScrollTrigger, useGSAP)

// ── Feature Card — floating, hover-sensitive 3D tilt ─────────
function FeatureCard({
  icon: Icon,
  title,
  desc,
  gradient,
  yOffset = 0,
}: {
  icon: typeof BarChart3
  title: string
  desc: string
  gradient: string
  yOffset?: number
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const tiltFrameRef = useRef<number | null>(null)
  const pointerRef = useRef({ x: 0, y: 0 })

  useEffect(() => () => {
    if (tiltFrameRef.current !== null) {
      cancelAnimationFrame(tiltFrameRef.current)
    }
  }, [])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    pointerRef.current = { x: e.clientX, y: e.clientY }
    if (tiltFrameRef.current !== null) return

    tiltFrameRef.current = requestAnimationFrame(() => {
      const card = cardRef.current
      tiltFrameRef.current = null
      if (!card) return

      const rect = card.getBoundingClientRect()
      const dx = (pointerRef.current.x - (rect.left + rect.width / 2)) / (rect.width / 2)
      const dy = (pointerRef.current.y - (rect.top + rect.height / 2)) / (rect.height / 2)
      card.style.transition = 'transform 0s, box-shadow 0.18s ease, border-color 0.18s ease'
      card.style.transform = `translateY(${yOffset - 6}px) perspective(800px) rotateX(${-dy * 3}deg) rotateY(${dx * 3}deg)`
      card.style.boxShadow = '0 24px 64px rgba(124,58,237,0.18), 0 4px 16px rgba(0,0,0,0.06)'
      card.style.borderColor = 'rgba(196,181,253,0.55)'
    })
  }

  const handleMouseLeave = () => {
    const card = cardRef.current
    if (!card) return
    if (tiltFrameRef.current !== null) {
      cancelAnimationFrame(tiltFrameRef.current)
      tiltFrameRef.current = null
    }
    card.style.transition = 'transform 0.18s cubic-bezier(0.22,1,0.36,1), box-shadow 0.18s ease, border-color 0.18s ease'
    card.style.transform = `translateY(${yOffset}px) perspective(800px) rotateX(0deg) rotateY(0deg)`
    card.style.boxShadow = '0 8px 36px rgba(124,58,237,0.09), 0 2px 8px rgba(0,0,0,0.04)'
    card.style.borderColor = 'rgba(255,255,255,0.72)'
  }

  return (
    <div
      ref={cardRef}
      className="feat-card"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        padding: '32px 28px',
        borderRadius: 24,
        background: 'rgba(255,255,255,0.42)',
        backdropFilter: 'blur(28px) saturate(150%)',
        WebkitBackdropFilter: 'blur(28px) saturate(150%)',
        border: '1px solid rgba(255,255,255,0.72)',
        boxShadow: '0 8px 36px rgba(124,58,237,0.09), 0 2px 8px rgba(0,0,0,0.04)',
        transition: 'transform 0.18s cubic-bezier(0.22,1,0.36,1), box-shadow 0.18s ease, border-color 0.18s ease',
        cursor: 'default',
        // Initial state — GSAP animates opacity/scale/filter on scroll reveal
        opacity: 0,
        filter: 'blur(6px)',
        willChange: 'transform, opacity, filter',
      }}
    >
      {/* Icon */}
      <div style={{
        width: 48, height: 48, borderRadius: 16,
        background: gradient,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 20,
        boxShadow: '0 4px 18px rgba(124,58,237,0.28)',
      }}>
        <Icon size={21} color="#fff" strokeWidth={1.7} />
      </div>
      <h3 style={{
        fontSize: 17.5, fontWeight: 700, color: '#1C1033',
        marginBottom: 10, letterSpacing: '-0.025em'
      }}>
        {title}
      </h3>
      <p style={{ fontSize: 14.5, color: '#4B4466', lineHeight: 1.68 }}>
        {desc}
      </p>
    </div>
  )
}

// ── Stat Item ─────────────────────────────────────────────────
function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="stat-item" style={{ textAlign: 'center', opacity: 0, transform: 'translateY(28px)' }}>
      <div style={{
        fontSize: 'clamp(2.2rem, 4.5vw, 3.6rem)',
        fontWeight: 800,
        letterSpacing: '-0.045em',
        background: 'linear-gradient(135deg, #7C3AED 20%, #EC4899 80%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        lineHeight: 1,
        marginBottom: 8,
      }}>
        {value}
      </div>
      <div style={{ fontSize: 14.5, color: '#6B5F8A', fontWeight: 500 }}>{label}</div>
    </div>
  )
}

// ── Workspace Transition Overlay ──────────────────────────────
function WorkspaceOverlay({ active }: { active: boolean }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        pointerEvents: active ? 'all' : 'none',
        opacity: 0,
        background: 'radial-gradient(ellipse at 50% 50%, rgba(168,85,247,0.9) 0%, rgba(124,58,237,0.97) 40%, #0D0620 100%)',
        transition: 'none',
      }}
      id="workspace-overlay"
    />
  )
}

// ── Main Landing Page ─────────────────────────────────────────
export function Landing() {
  const navigate = useNavigate()
  const { prefersReducedMotion, performanceTier } = useApp()
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollProgressRef = useRef(0)
  const scrollVelocityRef = useRef(0)
  const isTransitioning = useRef(false)
  const [overlayActive, setOverlayActive] = useState(false)

  // Track scroll progress + velocity for 3D scene
  useEffect(() => {
    let prevScrollY = window.scrollY
    let lastTime = performance.now()
    let rafId = 0

    const updateScrollState = () => {
      const now = performance.now()
      const dt = Math.max(now - lastTime, 1)
      const currentY = window.scrollY
      const max = document.body.scrollHeight - window.innerHeight
      scrollProgressRef.current = max > 0 ? currentY / max : 0
      const rawVel = (currentY - prevScrollY) / dt
      scrollVelocityRef.current = rawVel * 0.65 + scrollVelocityRef.current * 0.35
      prevScrollY = currentY
      lastTime = now
    }

    const onScroll = () => {
      if (rafId) return
      rafId = requestAnimationFrame(() => {
        rafId = 0
        updateScrollState()
      })
    }

    updateScrollState()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(rafId)
    }
  }, [])

  useGSAP(() => {
    if (prefersReducedMotion) {
      // Still reveal content, just no animation
      gsap.set(['.hero-badge', '.hero-headline .line', '.hero-sub', '.hero-cta', '.scroll-hint'], { opacity: 1, y: 0 })
      gsap.set('.feat-card', { opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 })
      gsap.set('.stat-item', { opacity: 1, y: 0 })
      return
    }

    const ctx = gsap.context(() => {

      // ── Hero entrance — staggered, elegant ─────────────────
      const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      heroTl
        .from('.hero-badge',         { y: 20, opacity: 0, duration: 0.9 }, 0.2)
        .from('.hero-headline .line', { y: 44, opacity: 0, duration: 1.1, stagger: 0.14 }, 0.45)
        .from('.hero-sub',            { y: 18, opacity: 0, duration: 0.85 }, 0.85)
        .from('.scroll-hint',         { opacity: 0, duration: 0.7 }, 1.5)

      // ── Hero scale/fade on scroll — parallax exit ──────────
      gsap.to('.hero-content', {
        scrollTrigger: {
          trigger: '.hero-section',
          start: 'top top',
          end: '70% top',
          scrub: true,
        },
        y: -50,
        scale: 0.92,
        opacity: 0,
        ease: 'none',
      })

      // Scroll hint fades when scrolling begins
      gsap.to('.scroll-hint', {
        scrollTrigger: {
          trigger: '.hero-section',
          start: '5% top',
          end: '20% top',
          scrub: true,
        },
        opacity: 0,
        y: -8,
      })

      // ── Section headings reveal ─────────────────────────────
      gsap.utils.toArray<HTMLElement>('.reveal-heading').forEach(el => {
        gsap.from(el, {
          scrollTrigger: { trigger: el, start: 'top 82%', toggleActions: 'play none none none' },
          y: 30, opacity: 0, duration: 0.85, ease: 'power3.out',
        })
      })

      // ── Feature cards — natural floating emergence ──────────
      // NOT a simple translateY slide. Cards start blurred, smaller, below — and
      // gently float into focus, as if the camera is bringing them into frame.
      gsap.utils.toArray<HTMLElement>('.feat-card').forEach((card, i) => {
        gsap.fromTo(card,
          {
            opacity: 0,
            y: 42,
            scale: 0.965,
            filter: 'blur(7px)',
          },
          {
            scrollTrigger: { trigger: card, start: 'top 88%', toggleActions: 'play none none none' },
            opacity: 1,
            y: 0,
            scale: 1,
            filter: 'blur(0px)',
            duration: 1.05,
            delay: i * 0.12, // subtle stagger: 0, 120ms, 240ms
            ease: 'power2.out',
          }
        )
      })

      // ── Stats reveal ────────────────────────────────────────
      gsap.utils.toArray<HTMLElement>('.stat-item').forEach((el, i) => {
        gsap.to(el, {
          scrollTrigger: { trigger: el, start: 'top 86%' },
          y: 0, opacity: 1, duration: 0.85, delay: i * 0.11, ease: 'power3.out',
        })
      })

      // ── Testimonial cards — gentle float from slight y offset
      gsap.utils.toArray<HTMLElement>('.review-card').forEach((card, i) => {
        gsap.fromTo(card,
          { opacity: 0, y: 36, scale: 0.975, filter: 'blur(5px)' },
          {
            scrollTrigger: { trigger: card, start: 'top 90%' },
            opacity: 1, y: 0, scale: 1, filter: 'blur(0px)',
            duration: 0.95, delay: i * 0.13, ease: 'power2.out',
          }
        )
      })

      // ── CTA section ─────────────────────────────────────────
      gsap.fromTo('.cta-section',
        { scale: 0.96, opacity: 0, y: 24 },
        {
          scrollTrigger: { trigger: '.cta-section', start: 'top 88%' },
          scale: 1, opacity: 1, y: 0, duration: 1.1, ease: 'power3.out',
        }
      )

      // ── Divider line reveal ──────────────────────────────────
      gsap.utils.toArray<HTMLElement>('.divider-line').forEach(el => {
        gsap.from(el, {
          scrollTrigger: { trigger: el, start: 'top 90%' },
          scaleX: 0, duration: 1.4, ease: 'power2.out', transformOrigin: 'left center',
        })
      })

    }, containerRef)

    return () => ctx.revert()
  }, { scope: containerRef })

  // Cinematic workspace transition
  const handleEnter = () => {
    if (isTransitioning.current) return
    isTransitioning.current = true

    if (prefersReducedMotion) {
      navigate('/dashboard')
      return
    }

    setOverlayActive(true)

    // Sequence: content dims → orb gathers → overlay blooms → navigate
    const tl = gsap.timeline({
      onComplete: () => navigate('/dashboard'),
    })

    tl
      .to('.hero-content, .feat-card, .stat-item, .review-card, .cta-section', {
        opacity: 0, y: -20, duration: 0.5, ease: 'power2.in', stagger: 0.02,
      })
      .to('#workspace-overlay', {
        opacity: 1,
        duration: 0.75,
        ease: 'power2.inOut',
      }, '-=0.2')
  }

  const features = [
    {
      icon: Brain,
      title: 'AI Sentiment Engine',
      desc: 'Explore positive, neutral, and negative sentiment across the ReviewBand sample review dataset.',
      gradient: 'linear-gradient(135deg, #7C3AED, #A855F7)',
      yOffset: 8,
    },
    {
      icon: BarChart3,
      title: 'Review Analytics',
      desc: 'Compare review ratings, customer sentiment, and source mix with a consistent sample dataset.',
      gradient: 'linear-gradient(135deg, #2563EB, #7C3AED)',
      yOffset: 0,
    },
    {
      icon: Zap,
      title: 'Actionable Signals',
      desc: 'Bring emerging topics and complaint patterns into focus so teams can decide what to investigate.',
      gradient: 'linear-gradient(135deg, #EC4899, #A855F7)',
      yOffset: 8,
    },
    {
      icon: TrendingUp,
      title: 'Topic Trends',
      desc: 'See which themes are rising, stable, or falling across the sample customer feedback.',
      gradient: 'linear-gradient(135deg, #059669, #2563EB)',
      yOffset: 0,
    },
    {
      icon: Shield,
      title: 'Privacy Signals',
      desc: 'Inspect the demo review records alongside their PII-processing status and redaction metadata.',
      gradient: 'linear-gradient(135deg, #D97706, #EC4899)',
      yOffset: 8,
    },
    {
      icon: Star,
      title: 'Review Intelligence',
      desc: 'Deep dive into individual reviews. Cluster similar feedback. Prioritize what matters most to your business.',
      gradient: 'linear-gradient(135deg, #7C3AED, #059669)',
      yOffset: 0,
    },
  ]

  const reviews = REVIEWS.slice(0, 3).map(review => ({
    text: review.text,
    author: `Customer ${review.authorInitial}`,
    role: `${review.productName} · ${review.date}`,
    stars: review.rating,
  }))

  return (
    <div ref={containerRef} style={{ position: 'relative', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* Workspace transition overlay */}
      <WorkspaceOverlay active={overlayActive} />

      {/* 3D AI Orb Canvas */}
      <Suspense fallback={null}>
        <LandingScene3D
          scrollProgressRef={scrollProgressRef}
          scrollVelocityRef={scrollVelocityRef}
          reducedMotion={prefersReducedMotion}
          performanceTier={performanceTier}
        />
      </Suspense>

      {/* ── HERO SECTION ──────────────────────────────────────── */}
      <section
        className="hero-section"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 10,
          padding: '80px 24px 140px',
        }}
      >
        <div
          className="hero-content"
          style={{ textAlign: 'center', maxWidth: 780, width: '100%' }}
        >

          {/* Eyebrow badge */}
          <div
            className="hero-badge"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 18px', borderRadius: 999,
              background: 'rgba(124,58,237,0.08)',
              border: '1px solid rgba(196,181,253,0.35)',
              color: '#7C3AED', fontSize: 11.5, fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              marginBottom: 36,
              backdropFilter: 'blur(16px)',
            }}
          >
            <Sparkles size={12} />
            <span>AI-Powered Review Intelligence · V2</span>
          </div>

          {/* Headline — deliberate hierarchy */}
          <h1
            className="hero-headline"
            style={{
              letterSpacing: '-0.048em',
              lineHeight: 1.03,
              marginBottom: 30,
            }}
          >
            {/* Line 1: deep navy */}
            <span
              className="line"
              style={{
                display: 'block',
                fontSize: 'clamp(3rem, 7.5vw, 6rem)',
                fontWeight: 900,
                color: '#1C1033',
              }}
            >
              Understand
            </span>
            {/* Line 2: violet → magenta gradient */}
            <span
              className="line"
              style={{
                display: 'block',
                fontSize: 'clamp(3rem, 7.5vw, 6rem)',
                fontWeight: 900,
                background: 'linear-gradient(135deg, #7C3AED 10%, #C026D3 60%, #EC4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Every Customer.
            </span>
            {/* Line 3: deep navy */}
            <span
              className="line"
              style={{
                display: 'block',
                fontSize: 'clamp(3rem, 7.5vw, 6rem)',
                fontWeight: 900,
                color: '#1C1033',
              }}
            >
              Instantly.
            </span>
          </h1>

          {/* Subtitle */}
          <p
            className="hero-sub"
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.2rem)',
              color: '#4B4466',
              maxWidth: 500,
              margin: '0 auto 56px',
              lineHeight: 1.7,
              fontWeight: 400,
            }}
          >
            Trace customer feedback from individual reviews to sentiment, topics, and complaint signals in one interactive dashboard.
          </p>

          {/* CTAs */}
          <div className="hero-cta" style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            {/* Primary */}
            <button
              id="landing-enter-btn"
              onClick={handleEnter}
              style={{
                display: 'flex', alignItems: 'center', gap: 11,
                padding: '16px 34px', borderRadius: 999,
                background: 'linear-gradient(135deg, #6D28D9 0%, #7C3AED 50%, #A855F7 100%)',
                color: '#fff', fontSize: 15.5, fontWeight: 700,
                border: 'none', cursor: 'pointer',
                boxShadow: '0 10px 36px rgba(124,58,237,0.40), 0 0 0 1px rgba(255,255,255,0.12) inset',
                transition: 'all 0.35s cubic-bezier(0.22,1,0.36,1)',
                letterSpacing: '-0.01em',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px)'
                e.currentTarget.style.boxShadow = '0 18px 52px rgba(124,58,237,0.50), 0 0 0 1px rgba(255,255,255,0.15) inset'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = '0 10px 36px rgba(124,58,237,0.40), 0 0 0 1px rgba(255,255,255,0.12) inset'
              }}
            >
              Enter Workspace
              <ArrowRight
                size={17}
                style={{ transition: 'transform 0.25s ease' }}
                className="btn-arrow"
              />
            </button>

            {/* Secondary */}
            <button
              id="landing-demo-btn"
              onClick={() => document.getElementById('customer-voices')?.scrollIntoView({
                behavior: prefersReducedMotion ? 'auto' : 'smooth',
              })}
              style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '16px 30px', borderRadius: 999,
                background: 'rgba(255,255,255,0.50)',
                backdropFilter: 'blur(20px)',
                color: '#5B21B6', fontSize: 15.5, fontWeight: 600,
                border: '1.5px solid rgba(196,181,253,0.45)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.78)'
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.borderColor = 'rgba(196,181,253,0.7)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.50)'
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.borderColor = 'rgba(196,181,253,0.45)'
              }}
            >
              <Sparkles size={16} /> Watch Demo
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          className="scroll-hint"
          style={{
            position: 'absolute', bottom: 38,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
            color: '#9B8CC4', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.12em',
            userSelect: 'none',
          }}
        >
          <span>SCROLL TO EXPLORE</span>
          <ChevronDown
            size={15}
            style={{ opacity: 0.65, animation: 'scrollHintBounce 2.4s ease-in-out infinite' }}
          />
        </div>
      </section>

      {/* ── CAPABILITIES SECTION ─────────────────────────────── */}
      <section
        style={{
          position: 'relative', zIndex: 10,
          padding: 'clamp(80px, 10vw, 140px) clamp(20px, 5vw, 72px)',
          maxWidth: 1200, margin: '0 auto',
        }}
      >
        {/* Section header */}
        <div style={{ textAlign: 'center', marginBottom: 80 }}>
          <p
            className="reveal-heading"
            style={{
              fontSize: 11.5, fontWeight: 700, letterSpacing: '0.14em',
              color: '#7C3AED', textTransform: 'uppercase', marginBottom: 14,
            }}
          >
            Capabilities
          </p>
          <h2
            className="reveal-heading"
            style={{
              fontSize: 'clamp(2rem, 4.5vw, 3.4rem)',
              fontWeight: 800, letterSpacing: '-0.038em',
              color: '#1C1033', lineHeight: 1.12, marginBottom: 18,
            }}
          >
            Intelligence at every layer
          </h2>
          <p
            className="reveal-heading"
            style={{
              fontSize: 'clamp(1rem, 1.8vw, 1.12rem)',
              color: '#4B4466', maxWidth: 500, margin: '0 auto', lineHeight: 1.65,
            }}
          >
            From raw text to boardroom insights — ReviewBand powers the full intelligence pipeline.
          </p>
        </div>

        {/* Feature cards — 3-column grid with intentional vertical offsets */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 22,
            alignItems: 'start',
          }}
        >
          {features.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </section>

      {/* ── STATS SECTION ────────────────────────────────────── */}
      <section id="customer-voices" style={{
        position: 'relative', zIndex: 10,
        padding: 'clamp(60px, 8vw, 110px) clamp(20px, 5vw, 72px)',
      }}>
        <div style={{
          maxWidth: 1060, margin: '0 auto',
          background: 'rgba(255,255,255,0.36)',
          backdropFilter: 'blur(32px) saturate(140%)',
          WebkitBackdropFilter: 'blur(32px) saturate(140%)',
          borderRadius: 32,
          border: '1px solid rgba(255,255,255,0.68)',
          boxShadow: '0 20px 70px rgba(124,58,237,0.10), 0 1px 0 rgba(255,255,255,0.6) inset',
          padding: 'clamp(40px, 6vw, 80px) clamp(28px, 5vw, 60px)',
        }}>
          <div className="divider-line" style={{
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.25), transparent)',
            marginBottom: 56,
            transformOrigin: 'left center',
          }} />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 44,
          }}>
            <StatItem value={BASELINE_TOTAL_REVIEWS.toLocaleString()} label="Sample Reviews" />
            <StatItem value={`${BASELINE_AVERAGE_RATING.toFixed(2)} / 5`} label="Average Rating" />
            <StatItem value={`${BASELINE_SENTIMENT.positive}%`} label="Positive Sentiment" />
            <StatItem value={BASELINE_ACTIVE_COMPLAINTS.toLocaleString()} label="Active Complaints" />
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS SECTION ──────────────────────────────── */}
      <section style={{
        position: 'relative', zIndex: 10,
        padding: 'clamp(60px, 8vw, 110px) clamp(20px, 5vw, 72px)',
        maxWidth: 1200, margin: '0 auto',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <h2
            className="reveal-heading"
            style={{
              fontSize: 'clamp(1.8rem, 3.8vw, 2.9rem)',
              fontWeight: 800, letterSpacing: '-0.03em',
              color: '#1C1033', marginBottom: 12,
            }}
          >
            Customer voices
          </h2>
          <p
            className="reveal-heading"
            style={{ fontSize: 15, color: '#6B5F8A', lineHeight: 1.6, fontWeight: 400 }}
          >
            Illustrative customer feedback from the ReviewBand sample dataset.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 22,
        }}>
          {reviews.map((r) => (
            <div
              key={r.author}
              className="review-card"
              style={{
                padding: '28px 26px',
                borderRadius: 22,
                background: 'rgba(255,255,255,0.44)',
                backdropFilter: 'blur(28px) saturate(145%)',
                WebkitBackdropFilter: 'blur(28px) saturate(145%)',
                border: '1px solid rgba(255,255,255,0.75)',
                boxShadow: '0 6px 32px rgba(124,58,237,0.08), 0 1px 4px rgba(0,0,0,0.03)',
                transition: 'transform 0.4s cubic-bezier(0.22,1,0.36,1), box-shadow 0.4s ease',
                opacity: 0,
                filter: 'blur(5px)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 16px 52px rgba(124,58,237,0.14)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = '0 6px 32px rgba(124,58,237,0.08)'
              }}
            >
              {/* Stars */}
              <div style={{ display: 'flex', gap: 3, marginBottom: 16 }}>
                {Array.from({ length: r.stars }).map((_, si) => (
                  <Star key={si} size={14} fill="#F59E0B" color="#F59E0B" />
                ))}
              </div>
              <p style={{
                fontSize: 14.5, color: '#2D1F4A', lineHeight: 1.68,
                marginBottom: 22, fontStyle: 'italic',
              }}>
                "{r.text}"
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: 13,
                  flexShrink: 0,
                }}>
                  {r.author[0]}
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1C1033' }}>{r.author}</div>
                  <div style={{ fontSize: 12, color: '#6B5F8A', marginTop: 1 }}>{r.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA SECTION ─────────────────────────────────── */}
      <section style={{
        position: 'relative', zIndex: 10,
        padding: 'clamp(60px, 8vw, 110px) clamp(20px, 5vw, 72px) clamp(100px, 14vw, 180px)',
      }}>
        <div
          className="cta-section"
          style={{
            maxWidth: 800, margin: '0 auto', textAlign: 'center',
            padding: 'clamp(52px, 7vw, 100px) clamp(32px, 5vw, 72px)',
            borderRadius: 36,
            background: 'linear-gradient(145deg, rgba(124,58,237,0.12) 0%, rgba(168,85,247,0.08) 50%, rgba(236,72,153,0.07) 100%)',
            backdropFilter: 'blur(36px) saturate(150%)',
            WebkitBackdropFilter: 'blur(36px) saturate(150%)',
            border: '1px solid rgba(196,181,253,0.38)',
            boxShadow: '0 28px 90px rgba(124,58,237,0.16), 0 1px 0 rgba(255,255,255,0.5) inset',
            opacity: 0, // GSAP reveals
          }}
        >
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '5px 15px', borderRadius: 999,
            background: 'rgba(124,58,237,0.09)', border: '1px solid rgba(196,181,253,0.32)',
            color: '#7C3AED', fontSize: 11, fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 28,
          }}>
            <Zap size={11} /> Ready to transform your feedback?
          </div>

          <h2 style={{
            fontSize: 'clamp(2rem, 5vw, 3.7rem)',
            fontWeight: 900, letterSpacing: '-0.042em',
            color: '#1C1033', lineHeight: 1.08, marginBottom: 20,
          }}>
            Start your intelligence<br />
            <span style={{
              background: 'linear-gradient(135deg, #7C3AED 20%, #C026D3 60%, #EC4899 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>journey today.</span>
          </h2>

          <p style={{
            fontSize: 15.5, color: '#4B4466', lineHeight: 1.65,
            marginBottom: 44, maxWidth: 400, margin: '0 auto 44px',
          }}>
            Move from customer voices to clear signals, useful insights, and informed action.
          </p>

          <button
            id="landing-cta-btn"
            onClick={handleEnter}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 13,
              padding: '18px 42px', borderRadius: 999,
              background: 'linear-gradient(135deg, #6D28D9, #7C3AED, #A855F7)',
              color: '#fff', fontSize: 16.5, fontWeight: 700,
              border: 'none', cursor: 'pointer',
              boxShadow: '0 14px 44px rgba(124,58,237,0.44), 0 0 0 1px rgba(255,255,255,0.12) inset',
              transition: 'all 0.35s cubic-bezier(0.22,1,0.36,1)',
              letterSpacing: '-0.015em',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 22px 60px rgba(124,58,237,0.55), 0 0 0 1px rgba(255,255,255,0.15) inset'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.boxShadow = '0 14px 44px rgba(124,58,237,0.44), 0 0 0 1px rgba(255,255,255,0.12) inset'
            }}
          >
            Enter Workspace <ArrowRight size={19} />
          </button>
        </div>
      </section>

      <style>{`
        @keyframes scrollHintBounce {
          0%, 100% { transform: translateY(0); opacity: 0.65; }
          50%       { transform: translateY(7px); opacity: 0.45; }
        }
        #landing-enter-btn:hover .btn-arrow,
        #landing-cta-btn:hover .btn-arrow {
          transform: translateX(4px);
        }

        /* Responsive: mobile — simpler, faster */
        @media (max-width: 768px) {
          .feat-card { transform: none !important; }
          .review-card:hover { transform: none !important; }
        }

        @media (prefers-reduced-motion: reduce) {
          .feat-card { opacity: 1 !important; filter: none !important; transform: none !important; }
          .stat-item { opacity: 1 !important; }
          .review-card { opacity: 1 !important; filter: none !important; }
          .cta-section { opacity: 1 !important; }
          @keyframes scrollHintBounce { 0%, 100% { transform: none; } }
        }
      `}</style>
    </div>
  )
}
