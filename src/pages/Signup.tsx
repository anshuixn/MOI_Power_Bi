import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ReviewBandLogo } from '@/components/navigation/Logo'
import { useAuth } from '@/hooks/useAuth'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function Signup() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, loading, signUpWithEmail, isConfigured } = useAuth()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ fullName?: string; email?: string; password?: string; confirmPassword?: string }>({})

  useEffect(() => {
    if (!loading && isAuthenticated) {
      const nextPath = location.state?.from && typeof location.state.from === 'string' ? location.state.from : '/dashboard'
      navigate(nextPath, { replace: true })
    }
  }, [isAuthenticated, loading, location.state, navigate])

  const authStateMessage = useMemo(() => {
    if (!isConfigured) {
      return 'Authentication is not configured yet. Add the public Supabase values to your frontend environment.'
    }

    return 'Create your ReviewBand account'
  }, [isConfigured])

  const validateForm = () => {
    const nextErrors: { fullName?: string; email?: string; password?: string; confirmPassword?: string } = {}

    if (!fullName.trim()) {
      nextErrors.fullName = 'Full name is required.'
    }

    if (!email.trim()) {
      nextErrors.email = 'Email is required.'
    } else if (!EMAIL_REGEX.test(email.trim())) {
      nextErrors.email = 'Enter a valid email address.'
    }

    if (!password) {
      nextErrors.password = 'Password is required.'
    } else if (password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters.'
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Please confirm your password.'
    } else if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'Passwords do not match.'
    }

    return nextErrors
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors = validateForm()
    setFieldErrors(nextErrors)
    setFormError('')
    setSuccessMessage('')

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setIsSubmitting(true)

    const result = await signUpWithEmail(fullName.trim(), email.trim(), password)

    setIsSubmitting(false)

    if (result.error) {
      setFormError(result.error)
      return
    }

    if (result.needsEmailConfirmation) {
      setSuccessMessage('Check your email to confirm your account before signing in.')
      setFullName('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setFieldErrors({})
      return
    }

    navigate('/dashboard', { replace: true })
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.2)' }}>
        <div style={{ width: 48, height: 48, borderRadius: 999, border: '3px solid rgba(124,58,237,0.18)', borderTopColor: '#7C3AED', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        position: 'relative',
        display: 'grid',
        placeItems: 'center',
        padding: '32px 20px',
        background:
          'radial-gradient(circle at top left, rgba(196, 181, 253, 0.38), transparent 28%), radial-gradient(circle at bottom right, rgba(251, 207, 232, 0.28), transparent 22%), #f6f4fb',
      }}
    >
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 280, height: 280, borderRadius: '50%', background: 'rgba(196, 181, 253, 0.25)', filter: 'blur(40px)', top: 80, left: 80 }} />
        <div style={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', background: 'rgba(167, 243, 208, 0.18)', filter: 'blur(36px)', bottom: 120, right: 160 }} />
        <div style={{ position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: 'rgba(251, 207, 232, 0.18)', filter: 'blur(32px)', top: '45%', left: '60%' }} />
      </div>

      <div
        aria-label="Create account panel"
        style={{
          position: 'relative',
          width: 'min(100%, 438px)',
          padding: '28px 24px 22px',
          borderRadius: 30,
          background: 'rgba(255,255,255,0.52)',
          border: '1px solid rgba(255,255,255,0.78)',
          boxShadow: '0 18px 50px rgba(109, 40, 217, 0.08), inset 0 1px 1px rgba(255,255,255,0.9)',
          backdropFilter: 'blur(22px) saturate(130%)',
          WebkitBackdropFilter: 'blur(22px) saturate(130%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
          <ReviewBandLogo size={34} />
        </div>

        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <h1 style={{ fontSize: 'clamp(2rem, 4vw, 2.5rem)', lineHeight: 1.1, letterSpacing: '-0.06em', margin: 0, color: '#1C1033' }}>
            Create account
          </h1>
          <p style={{ marginTop: 10, color: '#4B4466', fontSize: 15 }}>
            {authStateMessage}
          </p>
        </div>

        {formError ? (
          <div role="alert" aria-live="polite" style={{ marginBottom: 16, padding: '10px 12px', borderRadius: 12, background: 'rgba(254, 226, 226, 0.7)', border: '1px solid rgba(248, 113, 113, 0.35)', color: '#7F1D1D', fontSize: 14 }}>
            {formError}
          </div>
        ) : null}

        {successMessage ? (
          <div role="status" aria-live="polite" style={{ marginBottom: 16, padding: '10px 12px', borderRadius: 12, background: 'rgba(220, 252, 231, 0.8)', border: '1px solid rgba(34, 197, 94, 0.35)', color: '#166534', fontSize: 14 }}>
            {successMessage}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} noValidate style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gap: 8 }}>
            <label htmlFor="signup-full-name" style={{ fontSize: 13, fontWeight: 600, color: '#1C1033' }}>
              Full name
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '0 12px',
                minHeight: 48,
                borderRadius: 14,
                background: 'rgba(255,255,255,0.55)',
                border: `1px solid ${fieldErrors.fullName ? 'rgba(239, 68, 68, 0.5)' : 'rgba(196,181,253,0.28)'}`,
                boxShadow: 'inset 0 1px 2px rgba(124,58,237,0.04)',
              }}
            >
              <UserRound size={16} color="#8B83A3" aria-hidden="true" />
              <input
                id="signup-full-name"
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                autoComplete="name"
                placeholder="Jane Doe"
                aria-invalid={Boolean(fieldErrors.fullName)}
                aria-describedby={fieldErrors.fullName ? 'full-name-error' : undefined}
                style={{ width: '100%', border: 'none', background: 'transparent', color: '#1C1033', fontFamily: 'inherit', fontSize: 15, outline: 'none', padding: '12px 0' }}
              />
            </div>
            {fieldErrors.fullName ? (
              <p id="full-name-error" style={{ color: '#B91C1C', fontSize: 12, margin: 0 }}>{fieldErrors.fullName}</p>
            ) : null}
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <label htmlFor="signup-email" style={{ fontSize: 13, fontWeight: 600, color: '#1C1033' }}>
              Email
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '0 12px',
                minHeight: 48,
                borderRadius: 14,
                background: 'rgba(255,255,255,0.55)',
                border: `1px solid ${fieldErrors.email ? 'rgba(239, 68, 68, 0.5)' : 'rgba(196,181,253,0.28)'}`,
                boxShadow: 'inset 0 1px 2px rgba(124,58,237,0.04)',
              }}
            >
              <Mail size={16} color="#8B83A3" aria-hidden="true" />
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="you@reviewband.com"
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'signup-email-error' : undefined}
                style={{ width: '100%', border: 'none', background: 'transparent', color: '#1C1033', fontFamily: 'inherit', fontSize: 15, outline: 'none', padding: '12px 0' }}
              />
            </div>
            {fieldErrors.email ? (
              <p id="signup-email-error" style={{ color: '#B91C1C', fontSize: 12, margin: 0 }}>{fieldErrors.email}</p>
            ) : null}
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <label htmlFor="signup-password" style={{ fontSize: 13, fontWeight: 600, color: '#1C1033' }}>
              Password
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '0 12px',
                minHeight: 48,
                borderRadius: 14,
                background: 'rgba(255,255,255,0.55)',
                border: `1px solid ${fieldErrors.password ? 'rgba(239, 68, 68, 0.5)' : 'rgba(196,181,253,0.28)'}`,
                boxShadow: 'inset 0 1px 2px rgba(124,58,237,0.04)',
              }}
            >
              <LockKeyhole size={16} color="#8B83A3" aria-hidden="true" />
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                placeholder="••••••••"
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? 'signup-password-error' : undefined}
                style={{ width: '100%', border: 'none', background: 'transparent', color: '#1C1033', fontFamily: 'inherit', fontSize: 15, outline: 'none', padding: '12px 0' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{ border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#8B83A3', padding: 4 }}
              >
                {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              </button>
            </div>
            {fieldErrors.password ? (
              <p id="signup-password-error" style={{ color: '#B91C1C', fontSize: 12, margin: 0 }}>{fieldErrors.password}</p>
            ) : null}
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <label htmlFor="signup-confirm-password" style={{ fontSize: 13, fontWeight: 600, color: '#1C1033' }}>
              Confirm password
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '0 12px',
                minHeight: 48,
                borderRadius: 14,
                background: 'rgba(255,255,255,0.55)',
                border: `1px solid ${fieldErrors.confirmPassword ? 'rgba(239, 68, 68, 0.5)' : 'rgba(196,181,253,0.28)'}`,
                boxShadow: 'inset 0 1px 2px rgba(124,58,237,0.04)',
              }}
            >
              <LockKeyhole size={16} color="#8B83A3" aria-hidden="true" />
              <input
                id="signup-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                placeholder="••••••••"
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                aria-describedby={fieldErrors.confirmPassword ? 'signup-confirm-password-error' : undefined}
                style={{ width: '100%', border: 'none', background: 'transparent', color: '#1C1033', fontFamily: 'inherit', fontSize: 15, outline: 'none', padding: '12px 0' }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((current) => !current)}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                style={{ border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#8B83A3', padding: 4 }}
              >
                {showConfirmPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              </button>
            </div>
            {fieldErrors.confirmPassword ? (
              <p id="signup-confirm-password-error" style={{ color: '#B91C1C', fontSize: 12, margin: 0 }}>{fieldErrors.confirmPassword}</p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              border: 'none',
              borderRadius: 14,
              background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              minHeight: 48,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.8 : 1,
              boxShadow: '0 12px 28px rgba(124,58,237,0.26)',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {isSubmitting ? 'Creating account...' : 'Create account'}
              {!isSubmitting ? <ArrowRight size={16} aria-hidden="true" /> : null}
            </span>
          </button>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, color: '#4B4466', fontSize: 13 }}>
            <span>Already have an account?</span>
            <button type="button" onClick={() => navigate('/login')} style={{ border: 'none', background: 'transparent', color: '#7C3AED', fontWeight: 700, cursor: 'pointer' }}>
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
