// ============================================================
// ReviewBand — Immersive Scroll Landing Page
// Cinematic multi-section experience with GSAP ScrollTrigger
// 3D background, parallax, reveal animations
// ============================================================

import { useRef, useEffect, Suspense, lazy } from 'react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import {
  ArrowRight, Sparkles, BarChart3, Brain, Zap,
  Star, TrendingUp, Shield, ChevronDown
} from 'lucide-react'
import { ReviewBandLogo } from '@/components/navigation/Logo'
import { useApp } from '@/hooks/useApp'

const LandingScene3D = lazy(() =>
  import('@/components/three/LandingScene3D').then(m => ({ default: m.LandingScene3D }))
)

gsap.registerPlugin(ScrollTrigger, useGSAP)

// ── Feature Card ──────────────────────────────────────────────
function FeatureCard({
  icon: Icon, title, desc, gradient, delay
}: {
  icon: typeof BarChart3
  title: string
  desc: string
  gradient: string
  delay: number
}) {
  return (
    <div
      className="feat-card"
      data-delay={delay}
      style={{
        padding: '32px 28px',
        borderRadius: 24,
        background: 'rgba(255,255,255,0.45)',
        backdropFilter: 'blur(24px) saturate(140%)',
        WebkitBackdropFilter: 'blur(24px) saturate(140%)',
        border: '1px solid rgba(255,255,255,0.75)',
        boxShadow: '0 8px 32px rgba(124,58,237,0.08), 0 2px 8px rgba(0,0,0,0.04)',
        transition: 'transform 0.35s ease, box-shadow 0.35s ease',
        cursor: 'default',
        opacity: 0,
        transform: 'translateY(40px)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-6px)'
        e.currentTarget.style.boxShadow = '0 20px 60px rgba(124,58,237,0.18), 0 4px 16px rgba(0,0,0,0.06)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(124,58,237,0.08), 0 2px 8px rgba(0,0,0,0.04)'
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 16,
        background: gradient,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 20,
        boxShadow: '0 4px 16px rgba(124,58,237,0.25)',
      }}>
        <Icon size={22} color="#fff" strokeWidth={1.8} />
      </div>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1C1033', marginBottom: 10, letterSpacing: '-0.02em' }}>
        {title}
      </h3>
      <p style={{ fontSize: 14.5, color: '#4B4466', lineHeight: 1.65 }}>
        {desc}
      </p>
    </div>
  )
}

// ── Stat Item ─────────────────────────────────────────────────
function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="stat-item" style={{ textAlign: 'center', opacity: 0, transform: 'translateY(30px)' }}>
      <div style={{
        fontSize: 'clamp(2.5rem, 5vw, 4rem)',
        fontWeight: 800,
        letterSpacing: '-0.04em',
        background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        lineHeight: 1,
        marginBottom: 8,
      }}>
        {value}
      </div>
      <div style={{ fontSize: 15, color: '#6B5F8A', fontWeight: 500 }}>{label}</div>
    </div>
  )
}

// ── Main Landing Page ─────────────────────────────────────────
export function Landing() {
  const navigate = useNavigate()
  const { prefersReducedMotion } = useApp()
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef(0)

  // Track scroll progress for 3D scene
  useEffect(() => {
    const handleScroll = () => {
      const max = document.body.scrollHeight - window.innerHeight
      scrollRef.current = max > 0 ? window.scrollY / max : 0
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useGSAP(() => {
    if (prefersReducedMotion) return

    const ctx = gsap.context(() => {
      // ── Hero entrance ────────────────────────────────────
      const hereTl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      hereTl
        .from('.hero-logo', { scale: 0.7, opacity: 0, duration: 1.1, ease: 'back.out(1.5)' })
        .from('.hero-badge', { y: 24, opacity: 0, duration: 0.8 }, '-=0.6')
        .from('.hero-headline .line', { y: 40, opacity: 0, duration: 1, stagger: 0.12 }, '-=0.55')
        .from('.hero-sub', { y: 20, opacity: 0, duration: 0.8 }, '-=0.6')
        .from('.hero-cta', { y: 20, opacity: 0, duration: 0.8, stagger: 0.1 }, '-=0.55')
        .from('.scroll-hint', { opacity: 0, duration: 0.6 }, '-=0.3')

      // ── Logo float ───────────────────────────────────────
      gsap.to('.hero-logo-inner', {
        y: -12, duration: 3.2, ease: 'sine.inOut', yoyo: true, repeat: -1,
      })

      // ── Section heading parallax reveal ──────────────────
      gsap.utils.toArray<HTMLElement>('.reveal-heading').forEach(el => {
        gsap.from(el, {
          scrollTrigger: { trigger: el, start: 'top 80%', toggleActions: 'play none none none' },
          y: 36, opacity: 0, duration: 0.9, ease: 'power3.out',
        })
      })

      // ── Feature cards stagger ────────────────────────────
      gsap.utils.toArray<HTMLElement>('.feat-card').forEach((card, i) => {
        gsap.to(card, {
          scrollTrigger: { trigger: card, start: 'top 88%', toggleActions: 'play none none none' },
          y: 0, opacity: 1, duration: 0.75, delay: i * 0.08, ease: 'power3.out',
        })
      })

      // ── Stats counter ────────────────────────────────────
      gsap.utils.toArray<HTMLElement>('.stat-item').forEach((el, i) => {
        gsap.to(el, {
          scrollTrigger: { trigger: el, start: 'top 85%' },
          y: 0, opacity: 1, duration: 0.8, delay: i * 0.12, ease: 'power3.out',
        })
      })

      // ── Floating testimonial cards ────────────────────────
      gsap.utils.toArray<HTMLElement>('.review-card').forEach((card, i) => {
        gsap.from(card, {
          scrollTrigger: { trigger: card, start: 'top 90%' },
          x: i % 2 === 0 ? -60 : 60,
          opacity: 0,
          duration: 0.9,
          ease: 'power3.out',
          delay: i * 0.12,
        })
      })

      // ── CTA section ──────────────────────────────────────
      gsap.from('.cta-section', {
        scrollTrigger: { trigger: '.cta-section', start: 'top 85%' },
        scale: 0.94, opacity: 0, duration: 1, ease: 'power3.out',
      })

      // ── Sticky hero scale on scroll ───────────────────────
      gsap.to('.hero-content', {
        scrollTrigger: {
          trigger: '.hero-section',
          start: 'top top',
          end: 'bottom top',
          scrub: 1.5,
        },
        scale: 0.88,
        opacity: 0,
        y: -60,
        ease: 'none',
      })

      // ── Divider line reveal ───────────────────────────────
      gsap.utils.toArray<HTMLElement>('.divider-line').forEach(el => {
        gsap.from(el, {
          scrollTrigger: { trigger: el, start: 'top 90%' },
          scaleX: 0, duration: 1.2, ease: 'power2.out', transformOrigin: 'left center',
        })
      })
    }, containerRef)

    return () => ctx.revert()
  }, { scope: containerRef })

  const handleEnter = () => {
    if (prefersReducedMotion) { navigate('/dashboard'); return }
    gsap.to(containerRef.current, {
      opacity: 0, scale: 0.96, duration: 0.5, ease: 'power2.inOut',
      onComplete: () => navigate('/dashboard'),
    })
  }

  const features = [
    {
      icon: Brain, title: 'AI Sentiment Engine',
      desc: 'Understand customer emotion at scale. Our NLP model processes thousands of reviews in seconds.',
      gradient: 'linear-gradient(135deg, #7C3AED, #A855F7)',
    },
    {
      icon: BarChart3, title: 'Real-time Analytics',
      desc: 'Live dashboards with streaming data. Every review, every trend, every insight — instantly.',
      gradient: 'linear-gradient(135deg, #2563EB, #7C3AED)',
    },
    {
      icon: Zap, title: 'Instant Intelligence',
      desc: 'From raw review to actionable insight in under 200ms. Speed is our competitive advantage.',
      gradient: 'linear-gradient(135deg, #EC4899, #A855F7)',
    },
    {
      icon: TrendingUp, title: 'Predictive Trends',
      desc: 'Spot emerging themes before they go viral. Stay ahead with predictive topic modeling.',
      gradient: 'linear-gradient(135deg, #059669, #2563EB)',
    },
    {
      icon: Shield, title: 'Enterprise Security',
      desc: 'SOC 2 compliant, end-to-end encrypted. Your customer data stays private and secure.',
      gradient: 'linear-gradient(135deg, #D97706, #EC4899)',
    },
    {
      icon: Star, title: 'Review Intelligence',
      desc: 'Deep dive into individual reviews. Cluster similar feedback. Prioritize what matters most.',
      gradient: 'linear-gradient(135deg, #7C3AED, #059669)',
    },
  ]

  const reviews = [
    { text: 'ReviewBand transformed how we understand our customers. The AI insights are incredibly accurate.', author: 'Sarah K.', role: 'Head of CX, TechCorp', stars: 5 },
    { text: 'Setup took 10 minutes. The ROI was visible within a week. This is the future of feedback analysis.', author: 'Marcus R.', role: 'VP Product, ScaleUp', stars: 5 },
    { text: 'The 3D visualization of sentiment trends is unlike anything I\'ve seen. Absolutely stunning.', author: 'Priya M.', role: 'Data Director, Nexus', stars: 5 },
  ]

  return (
    <div ref={containerRef} style={{ position: 'relative', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ── 3D Background Canvas ───────────────────────────── */}
      <Suspense fallback={null}>
        <LandingScene3D scrollRef={scrollRef} reducedMotion={prefersReducedMotion} />
      </Suspense>

      {/* ── HERO SECTION ──────────────────────────────────── */}
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
          padding: '80px 24px 120px',
        }}
      >
        <div className="hero-content" style={{ textAlign: 'center', maxWidth: 800, width: '100%' }}>

          {/* Logo */}
          <div className="hero-logo" style={{ marginBottom: 36 }}>
            <div className="hero-logo-inner" style={{ display: 'inline-block' }}>
              <ReviewBandLogo size={88} variant="mark" />
            </div>
          </div>

          {/* Badge */}
          <div
            className="hero-badge"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 18px', borderRadius: 999,
              background: 'rgba(124,58,237,0.1)',
              border: '1px solid rgba(196,181,253,0.4)',
              color: '#7C3AED', fontSize: 12.5, fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              marginBottom: 28,
              backdropFilter: 'blur(12px)',
            }}
          >
            <Sparkles size={13} />
            <span>AI-Powered Review Intelligence · V2</span>
          </div>

          {/* Headline */}
          <h1 className="hero-headline" style={{
            fontSize: 'clamp(2.8rem, 7vw, 5.5rem)',
            fontWeight: 900,
            letterSpacing: '-0.045em',
            lineHeight: 1.05,
            marginBottom: 28,
          }}>
            <span className="line" style={{ display: 'block', color: '#1C1033' }}>Understand</span>
            <span
              className="line"
              style={{
                display: 'block',
                background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 60%, #A855F7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >Every Customer.</span>
            <span className="line" style={{ display: 'block', color: '#1C1033' }}>Instantly.</span>
          </h1>

          {/* Subtitle */}
          <p
            className="hero-sub"
            style={{
              fontSize: 'clamp(1rem, 2.2vw, 1.3rem)',
              color: '#4B4466',
              maxWidth: 520,
              margin: '0 auto 52px',
              lineHeight: 1.65,
            }}
          >
            Transform millions of reviews into competitive intelligence. Real-time sentiment, predictive trends, and AI-driven insights — in one cinematic dashboard.
          </p>

          {/* CTAs */}
          <div className="hero-cta" style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              id="landing-enter-btn"
              onClick={handleEnter}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '17px 36px', borderRadius: 999,
                background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
                color: '#fff', fontSize: 16, fontWeight: 700,
                border: 'none', cursor: 'pointer',
                boxShadow: '0 10px 32px rgba(124,58,237,0.38), inset 0 1px 0 rgba(255,255,255,0.15)',
                transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                letterSpacing: '-0.01em',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)'
                e.currentTarget.style.boxShadow = '0 16px 48px rgba(124,58,237,0.48), inset 0 1px 0 rgba(255,255,255,0.15)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = '0 10px 32px rgba(124,58,237,0.38), inset 0 1px 0 rgba(255,255,255,0.15)'
              }}
            >
              Enter Workspace <ArrowRight size={19} />
            </button>

            <button
              id="landing-demo-btn"
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '17px 32px', borderRadius: 999,
                background: 'rgba(255,255,255,0.55)',
                backdropFilter: 'blur(20px)',
                color: '#7C3AED', fontSize: 16, fontWeight: 600,
                border: '1.5px solid rgba(196,181,253,0.5)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.8)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.55)'
                e.currentTarget.style.transform = 'none'
              }}
            >
              <Sparkles size={17} /> Watch Demo
            </button>
          </div>
        </div>

        {/* Scroll hint */}
        <div
          className="scroll-hint"
          style={{
            position: 'absolute', bottom: 36,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            color: '#9B8CC4', fontSize: 12, fontWeight: 500, letterSpacing: '0.06em',
            animation: 'bounce-hint 2s ease-in-out infinite',
          }}
        >
          <span>SCROLL TO EXPLORE</span>
          <ChevronDown size={16} style={{ opacity: 0.7 }} />
        </div>
      </section>

      {/* ── FEATURES SECTION ──────────────────────────────── */}
      <section
        style={{
          position: 'relative', zIndex: 10,
          padding: 'clamp(80px, 10vw, 140px) clamp(20px, 6vw, 80px)',
          maxWidth: 1200, margin: '0 auto',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 72 }}>
          <p className="reveal-heading" style={{
            fontSize: 13, fontWeight: 700, letterSpacing: '0.12em',
            color: '#7C3AED', textTransform: 'uppercase', marginBottom: 16,
          }}>
            Capabilities
          </p>
          <h2 className="reveal-heading" style={{
            fontSize: 'clamp(2rem, 4.5vw, 3.5rem)',
            fontWeight: 800, letterSpacing: '-0.035em',
            color: '#1C1033', lineHeight: 1.15, marginBottom: 20,
          }}>
            Intelligence at every layer
          </h2>
          <p className="reveal-heading" style={{
            fontSize: 'clamp(1rem, 1.8vw, 1.15rem)',
            color: '#4B4466', maxWidth: 520, margin: '0 auto', lineHeight: 1.6,
          }}>
            From raw text to boardroom insights — ReviewBand powers the full pipeline.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 24,
        }}>
          {features.map((f, i) => (
            <FeatureCard key={f.title} {...f} delay={i * 0.08} />
          ))}
        </div>
      </section>

      {/* ── STATS SECTION ─────────────────────────────────── */}
      <section style={{
        position: 'relative', zIndex: 10,
        padding: 'clamp(60px, 8vw, 110px) clamp(20px, 6vw, 80px)',
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          background: 'rgba(255,255,255,0.38)',
          backdropFilter: 'blur(28px) saturate(130%)',
          WebkitBackdropFilter: 'blur(28px) saturate(130%)',
          borderRadius: 32,
          border: '1px solid rgba(255,255,255,0.7)',
          boxShadow: '0 16px 60px rgba(124,58,237,0.1)',
          padding: 'clamp(40px, 6vw, 80px) clamp(28px, 5vw, 60px)',
        }}>
          <div className="divider-line" style={{
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.3), transparent)',
            marginBottom: 56,
            transformOrigin: 'left center',
          }} />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 48,
          }}>
            <StatItem value="12M+" label="Reviews Analyzed" />
            <StatItem value="98.2%" label="Sentiment Accuracy" />
            <StatItem value="< 200ms" label="Processing Speed" />
            <StatItem value="4,800+" label="Brands Powered" />
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS SECTION ──────────────────────────── */}
      <section style={{
        position: 'relative', zIndex: 10,
        padding: 'clamp(60px, 8vw, 110px) clamp(20px, 6vw, 80px)',
        maxWidth: 1200, margin: '0 auto',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <h2 className="reveal-heading" style={{
            fontSize: 'clamp(1.8rem, 4vw, 3rem)',
            fontWeight: 800, letterSpacing: '-0.03em', color: '#1C1033', marginBottom: 12,
          }}>
            Loved by teams worldwide
          </h2>
          <p className="reveal-heading" style={{ fontSize: 15.5, color: '#6B5F8A', lineHeight: 1.6 }}>
            Join thousands of brands making smarter decisions.
          </p>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 24,
        }}>
          {reviews.map((r) => (
            <div
              key={r.author}
              className="review-card"
              style={{
                padding: '28px 26px',
                borderRadius: 22,
                background: 'rgba(255,255,255,0.5)',
                backdropFilter: 'blur(24px) saturate(140%)',
                WebkitBackdropFilter: 'blur(24px) saturate(140%)',
                border: '1px solid rgba(255,255,255,0.8)',
                boxShadow: '0 6px 28px rgba(124,58,237,0.07)',
              }}
            >
              <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
                {Array.from({ length: r.stars }).map((_, si) => (
                  <Star key={si} size={15} fill="#F59E0B" color="#F59E0B" />
                ))}
              </div>
              <p style={{ fontSize: 15, color: '#2D1F4A', lineHeight: 1.65, marginBottom: 20, fontStyle: 'italic' }}>
                "{r.text}"
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: `linear-gradient(135deg, #7C3AED, #EC4899)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: 14,
                }}>
                  {r.author[0]}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1C1033' }}>{r.author}</div>
                  <div style={{ fontSize: 12.5, color: '#6B5F8A' }}>{r.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA SECTION ───────────────────────────────────── */}
      <section style={{
        position: 'relative', zIndex: 10,
        padding: 'clamp(60px, 8vw, 110px) clamp(20px, 6vw, 80px) clamp(100px, 12vw, 160px)',
      }}>
        <div
          className="cta-section"
          style={{
            maxWidth: 820, margin: '0 auto', textAlign: 'center',
            padding: 'clamp(48px, 7vw, 96px) clamp(32px, 5vw, 72px)',
            borderRadius: 36,
            background: 'linear-gradient(135deg, rgba(124,58,237,0.14) 0%, rgba(236,72,153,0.08) 100%)',
            backdropFilter: 'blur(32px) saturate(140%)',
            WebkitBackdropFilter: 'blur(32px) saturate(140%)',
            border: '1px solid rgba(196,181,253,0.4)',
            boxShadow: '0 24px 80px rgba(124,58,237,0.15)',
          }}
        >
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '5px 16px', borderRadius: 999,
            background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(196,181,253,0.35)',
            color: '#7C3AED', fontSize: 12, fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 28,
          }}>
            <Zap size={12} /> Ready to transform your feedback?
          </div>
          <h2 style={{
            fontSize: 'clamp(2rem, 5vw, 3.8rem)',
            fontWeight: 900, letterSpacing: '-0.04em', color: '#1C1033',
            lineHeight: 1.1, marginBottom: 20,
          }}>
            Start your intelligence<br />
            <span style={{
              background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>journey today.</span>
          </h2>
          <p style={{ fontSize: 16, color: '#4B4466', lineHeight: 1.6, marginBottom: 44, maxWidth: 420, margin: '0 auto 44px' }}>
            Join 4,800+ brands using ReviewBand to turn customer feedback into their biggest competitive advantage.
          </p>
          <button
            id="landing-cta-btn"
            onClick={handleEnter}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 14,
              padding: '19px 44px', borderRadius: 999,
              background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
              color: '#fff', fontSize: 17, fontWeight: 700,
              border: 'none', cursor: 'pointer',
              boxShadow: '0 12px 40px rgba(124,58,237,0.42), inset 0 1px 0 rgba(255,255,255,0.15)',
              transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
              letterSpacing: '-0.015em',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px) scale(1.03)'
              e.currentTarget.style.boxShadow = '0 20px 56px rgba(124,58,237,0.52), inset 0 1px 0 rgba(255,255,255,0.15)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(124,58,237,0.42), inset 0 1px 0 rgba(255,255,255,0.15)'
            }}
          >
            Enter Workspace <ArrowRight size={20} />
          </button>
        </div>
      </section>

      <style>{`
        @keyframes bounce-hint {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(8px); }
        }
      `}</style>
    </div>
  )
}
