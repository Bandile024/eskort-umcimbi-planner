import { createServerClient, CookieOptions } from '@supabase/ssr'
import { NextResponse, NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // If Supabase is not configured, bypass auth checks to allow previewing
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.next()
    }

    let supabaseResponse = NextResponse.next({
      request,
    })

    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              request.cookies.set(name, value)
            )
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const url = request.nextUrl.pathname

    // 1. Static files and internal Next.js assets
    if (
      url.startsWith('/_next') ||
      url.startsWith('/api') ||
      url.includes('.')
    ) {
      return supabaseResponse
    }

    const isPublicAuthPage =
      url === '/login' ||
      url === '/signup' ||
      url === '/reset-password' ||
      url === '/admin/login'

    // If user is logged in
    if (user) {
      const isAdminEmail = user.email?.toLowerCase() === 'admin@eskortstore.co.za'
      let isAdmin = isAdminEmail

      if (!isAdmin) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        isAdmin = profile?.role === 'admin'
      }

      // If user visits public auth page while logged in
      if (isPublicAuthPage) {
        if (isAdmin) {
          return NextResponse.redirect(new URL('/admin/dashboard', request.url))
        } else {
          return NextResponse.redirect(new URL('/', request.url))
        }
      }

      // If admin visits root '/', redirect to admin dashboard
      if (url === '/') {
        if (isAdmin) {
          return NextResponse.redirect(new URL('/admin/dashboard', request.url))
        }
        // Regular user visits '/' -> allow viewing Eskort Umcimbi Planner!
        return supabaseResponse
      }

      // If non-admin tries to visit /admin routes
      if (url.startsWith('/admin') && !isAdmin) {
        return NextResponse.redirect(new URL('/', request.url))
      }

      // Allow all other routes for logged-in user
      return supabaseResponse
    }

    // User is NOT logged in:
    // Allow public auth pages (login, signup, reset-password, admin/login)
    if (isPublicAuthPage) {
      return supabaseResponse
    }

    // For any other route (including root '/'):
    // Step 1: Visit localhost:3000 -> Redirects to /login
    const loginUrl = new URL('/login', request.url)
    if (url !== '/') {
      loginUrl.searchParams.set('redirect', url)
    }
    return NextResponse.redirect(loginUrl)
  } catch (error) {
    console.error('[Middleware error]:', error)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/signup',
    '/reset-password',
    '/admin/:path*',
    '/account/:path*',
    '/checkout',
    '/build-my-braai/:path*',
    '/order-confirmation',
  ],
}
