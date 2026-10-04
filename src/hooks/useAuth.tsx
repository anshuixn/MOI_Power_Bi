import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { getSupabaseErrorMessage, hasSupabaseConfig, supabase } from '@/lib/supabase'

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  isConfigured: boolean
  signInWithEmail: (email: string, password: string) => Promise<{ error?: string }>
  signUpWithEmail: (fullName: string, email: string, password: string) => Promise<{ error?: string; needsEmailConfirmation?: boolean }>
  signOut: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const client = supabase
    if (!client) {
      setLoading(false)
      return
    }

    let isMounted = true

    const loadSession = async () => {
      const { data: { session: currentSession } } = await client.auth.getSession()
      if (isMounted) {
        setSession(currentSession)
        setLoading(false)
      }
    }

    void loadSession()

    const { data: { subscription } } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (isMounted) {
        setSession(nextSession)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      return { error: 'Authentication is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.' }
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      return { error: getSupabaseErrorMessage(error) }
    }

    return {}
  }, [])

  const signUpWithEmail = useCallback(async (fullName: string, email: string, password: string) => {
    if (!supabase) {
      return { error: 'Authentication is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.' }
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (error) {
      return { error: getSupabaseErrorMessage(error) }
    }

    return {
      needsEmailConfirmation: Boolean(data.user && !data.session),
    }
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) {
      return false
    }

    const { error } = await supabase.auth.signOut()
    return !error
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    loading,
    isAuthenticated: Boolean(session?.user),
    isConfigured: hasSupabaseConfig,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  }), [loading, session, signInWithEmail, signUpWithEmail, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
