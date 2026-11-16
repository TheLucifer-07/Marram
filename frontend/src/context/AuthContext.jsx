import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase'
import { Api, errorMessage } from '../lib/api'

const AuthContext = createContext(null)

/**
 * Supabase proves who the person is. The Spring Boot backend resolves the application profile
 * (and all workspace permissions) from that token, so the profile is always fetched from /auth/me.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState(null)

  const loadProfile = useCallback(async () => {
    setProfileError(null)
    try {
      setProfile(await Api.me())
    } catch (e) {
      setProfile(null)
      if (e.response?.status === 401) {
        await supabase?.auth.signOut()
      } else {
        setProfileError(errorMessage(e, 'Could not load your profile.'))
      }
    }
  }, [])

  useEffect(() => {
    if (!supabaseConfigured) { setLoading(false); return undefined }
    let active = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      if (data.session) await loadProfile()
      if (active) setLoading(false)
    }).catch(() => active && setLoading(false))

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next)
      if (event === 'SIGNED_IN' && next) setTimeout(loadProfile, 0)
      if (event === 'SIGNED_OUT') { setProfile(null); setProfileError(null) }
    })
    return () => { active = false; sub.subscription.unsubscribe() }
  }, [loadProfile])

  const signUp = useCallback(async ({ fullName, email, password }) => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) throw error
    // Supabase hides duplicate emails by returning a user with no identities.
    if (data.user && data.user.identities?.length === 0) {
      const dup = new Error('An account with this email already exists. Sign in instead.')
      dup.code = 'duplicate'
      throw dup
    }
    return { needsConfirmation: !data.session }
  }, [])

  const signIn = useCallback(async ({ email, password }) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut()
    setProfile(null)
  }, [])

  const value = useMemo(() => ({
    configured: supabaseConfigured,
    session, profile, loading, profileError,
    isAuthenticated: Boolean(session),
    signUp, signIn, signInWithGoogle, signOut,
    reloadProfile: loadProfile,
    setProfile,
  }), [session, profile, loading, profileError, signUp, signIn, signInWithGoogle, signOut, loadProfile])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
