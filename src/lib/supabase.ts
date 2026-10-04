import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

export function getSupabaseErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'Something went wrong while signing you in. Please try again.'
  }

  const maybeMessage = 'message' in error ? String((error as { message?: string }).message ?? '') : ''
  const normalized = maybeMessage.trim().toLowerCase()

  if (!normalized) {
    return 'Something went wrong while signing you in. Please try again.'
  }

  if (normalized.includes('invalid login credentials') || normalized.includes('invalid credentials')) {
    return 'Email or password is incorrect.'
  }

  if (normalized.includes('network') || normalized.includes('failed to fetch')) {
    return 'Unable to connect. Please check your connection and try again.'
  }

  if (normalized.includes('email')) {
    return 'Enter a valid email address.'
  }

  return 'Something went wrong while signing you in. Please try again.'
}
