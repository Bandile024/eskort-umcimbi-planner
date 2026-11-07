import { createServerClient, CookieOptions } from '@supabase/ssr'
import { NextResponse, NextRequest } from 'next/server'
import { getGroupOrderPublicOrigin } from '@/lib/groupOrderUtils'

export async function middleware(request: NextRequest) {
  try {
    if (request.nextUrl.pathname.startsWith('/group/')) {
      let groupOrigin: string
      try {
        groupOrigin = getGroupOrderPublicOrigin(request.nextUrl.origin)
      } catch (error) {
        if (process.env.NODE_ENV === 'production') {
          console.error('[Group-order domain configuration error]:', error)
          return new NextResponse('Group-order pages are temporarily unavailable.', { status: 503 })
        }
        throw error
      }

      if (groupOrigin !== request.nextUrl.origin) {
        const groupUrl = new URL(request.nextUrl.pathname, groupOrigin)
        const contributionId = request.nextUrl.searchParams.get('contribution_id')
        if (
          /\/(success|cancelled)$/.test(request.nextUrl.pathname)
          && contributionId
          && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(contributionId)
        ) {
          groupUrl.searchParams.set('contribution_id', contributionId)
        }
        const redirect = NextResponse.redirect(groupUrl, 307)
        redirect.headers.set('Cache-Control', 'no-store')
        return redirect
      }
      return NextResponse.next()
    }

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

    // Keep public pages, including the homepage, available to visitors.
    if (url === '/') {
      if (!user) return supabaseResponse
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
    '/group/:path*',
  ],
}
