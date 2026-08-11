import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { AUTH_STORAGE_KEY, isSupabaseConfigured, supabase } from '../lib/supabase'
import { formatAuthError } from '../utils/authErrors'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return undefined
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async (email, password) => {
    if (!supabase) {
      throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      const friendly = new Error(formatAuthError(error))
      friendly.cause = error
      throw friendly
    }
    setSession(data.session)
    return data
  }, [])

  const signUp = useCallback(async (email, password) => {
    if (!supabase) {
      throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
    }

    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      const friendly = new Error(formatAuthError(error))
      friendly.cause = error
      throw friendly
    }
    if (data.session) setSession(data.session)
    return data
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) {
      const friendly = new Error(formatAuthError(error))
      friendly.cause = error
      throw friendly
    }
    setSession(null)
  }, [])

  const getAccessToken = useCallback(() => session?.access_token ?? null, [session])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      isAuthenticated: Boolean(session?.user),
      loading,
      isConfigured: isSupabaseConfigured(),
      authStorageKey: AUTH_STORAGE_KEY,
      signIn,
      signUp,
      signOut,
      getAccessToken,
    }),
    [session, loading, signIn, signUp, signOut, getAccessToken]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
