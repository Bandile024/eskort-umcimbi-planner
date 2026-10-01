import { createServerClient, CookieOptions } from '@supabase/ssr'
import { NextResponse, NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  try {
    let supabaseResponse = NextResponse.next({
      request,
    })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

    // Handle root path - redirect unauthenticated users to login
    if (url === '/') {
      if (!user) {
        return NextResponse.redirect(new URL('/login', request.url))
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'admin') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url))
      }
    }

    // Protect admin routes (except /admin/login which is the login page itself)
    if (url.startsWith('/admin') && url !== '/admin/login') {
      if (!user) {
        const loginUrl = new URL('/admin/login', request.url)
        loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
        return NextResponse.redirect(loginUrl)
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }

    // Protect account routes
    if (url.startsWith('/account')) {
      if (!user) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
        return NextResponse.redirect(loginUrl)
      }
    }

    // Protect checkout route
    if (url === '/checkout') {
      if (!user) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirect', '/checkout')
        return NextResponse.redirect(loginUrl)
      }
    }

    return supabaseResponse
  } catch (error) {
    console.error('[Middleware error]:', error)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/',
    '/admin/:path*',
    '/account/:path*',
    '/checkout',
    '/order-confirmation',
  ],
}
