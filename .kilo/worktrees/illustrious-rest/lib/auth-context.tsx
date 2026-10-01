'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { User, Session } from '@supabase/supabase-js'

export type UserRole = 'customer' | 'admin' | null

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  role: UserRole
  signIn: (email: string, password: string) => Promise<{ error: string | null; data: { session: Session | null; user: User | null } | null }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null; data: { session: Session | null; user: User | null } | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: string | null }>
  updatePassword: (password: string) => Promise<{ error: string | null }>
  fetchRole: () => Promise<UserRole>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export async function getUserRole(userId: string, email?: string | null): Promise<'customer' | 'admin'> {
  if (!userId) return 'customer'
  if (email && email.toLowerCase() === 'admin@eskortstore.co.za') {
    return 'admin'
  }
  console.log('[getUserRole] Looking up user:', userId)

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  console.log('[getUserRole] Profile:', profile)
  console.log('[getUserRole] Error:', error)

  if (profile?.role === 'admin' || profile?.email?.toLowerCase() === 'admin@eskortstore.co.za') {
    return 'admin'
  }

  if (error || !profile) {
    return 'customer'
  }

  return (profile.role as 'customer' | 'admin') || 'customer'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<UserRole>(null)

  const fetchRole = async (): Promise<UserRole> => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        console.log('[fetchRole] No session, returning null')
        setRole(null)
        return null
      }
      console.log('[fetchRole] Session user ID:', session.user.id, 'email:', session.user.email)
      const userRole = await getUserRole(session.user.id, session.user.email)
      setRole(userRole)
      return userRole
    } catch (err) {
      console.warn('[fetchRole] Error fetching role:', err)
      setRole(null)
      return null
    }
  }

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        console.log('[initAuth] Session:', session?.user?.email, session?.user?.id)
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          const userRole = await getUserRole(session.user.id, session.user.email)
          setRole(userRole)
        } else {
          setRole(null)
        }
      } catch (err) {
        console.warn('[initAuth] Error initializing auth:', err)
        setSession(null)
        setUser(null)
        setRole(null)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        console.log('[onAuthStateChange]', event, session?.user?.email)
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          const userRole = await getUserRole(session.user.id, session.user.email)
          setRole(userRole)
        } else {
          setRole(null)
        }
      } catch (err) {
        console.warn('[onAuthStateChange] Error:', err)
      } finally {
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    console.log('[signIn] Attempting sign in for:', email)
    const { error, data } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      console.error('[signIn] Error:', error.message)
      return { error: error.message ?? null, data: null }
    }
    console.log('[signIn] Success. User:', data.user?.id, data.user?.email)
    return { error: null, data }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) {
      console.error('[signUp] Error:', error.message)
      return { error: error.message ?? null, data: null }
    }
    console.log('[signUp] User created:', data.user?.id, data.user?.email)
    if (data?.user) {
      try {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ full_name: fullName })
          .eq('id', data.user.id)
        if (updateError) {
          console.error('[signUp] Profile update error:', updateError.message)
        } else {
          console.log('[signUp] Profile updated successfully for:', data.user.id)
        }
      } catch (updateErr) {
        console.error('[signUp] Profile update error:', updateErr)
      }
    }
    return { error: null, data }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error: error?.message ?? null }
  }

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password })
    return { error: error?.message ?? null }
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, role, signIn, signUp, signOut, resetPassword, updatePassword, fetchRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}