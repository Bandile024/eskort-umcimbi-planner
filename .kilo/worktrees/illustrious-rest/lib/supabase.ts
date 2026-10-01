import { createClient } from '@supabase/supabase-js'

const fallbackUrl = 'https://placeholder.supabase.co'
const fallbackAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-IDcSemACt8x4iTMCda8Yhe3iZaWbvV5XKSTbuAn0M'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || fallbackUrl
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || fallbackAnonKey

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('[Supabase] Missing Supabase environment variables. App is running with placeholder configuration.')
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