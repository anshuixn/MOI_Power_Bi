// ============================================================
// Error Boundary — wraps pages/3D canvas with graceful fallback
// ============================================================

import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCcw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ReviewBand] ErrorBoundary caught:', error, info)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 300,
            padding: 40,
            textAlign: 'center',
            background: 'rgba(255,255,255,0.6)',
            backdropFilter: 'blur(12px)',
            borderRadius: 20,
            border: '1px solid rgba(244,63,94,0.15)',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'rgba(244,63,94,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <AlertTriangle size={24} style={{ color: '#F43F5E' }} />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1C1033', marginBottom: 8 }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: 14, color: '#8B83A3', maxWidth: 380, marginBottom: 24, lineHeight: 1.5 }}>
            {this.state.error?.message ?? 'An unexpected error occurred in this component.'}
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
              border: 'none',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCcw size={14} /> Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
