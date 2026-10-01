import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Custom cookie-based storage so the session is readable by both
// client-side queries (JWT token) and server-side middleware/API routes.
const cookieStorage = {
  getItem: (key: string) => {
    if (typeof document === 'undefined') return null
    const cookies = document.cookie.split(';')
    const cookie = cookies.find(c => c.trim().startsWith(`${key}=`))
    return cookie ? decodeURIComponent(cookie.split('=')[1]) : null
  },
  setItem: (key: string, value: string) => {
    if (typeof document === 'undefined') return
    document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`
  },
  removeItem: (key: string) => {
    if (typeof document === 'undefined') return
    document.cookie = `${key}=; path=/; max-age=0; samesite=lax`
  },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: cookieStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})