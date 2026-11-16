import { timingSafeEqual } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const apiKey = process.env.ORDERS_API_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!apiKey || !supabaseUrl || !serviceRoleKey) {
    console.error('Confirmed orders API is missing required environment configuration')
    return NextResponse.json(
      { success: false, error: 'Server configuration error' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const authorization = request.headers.get('authorization') ?? ''
  const match = authorization.match(/^Bearer\s+(.+)$/i)
  const providedKey = match?.[1]

  if (!providedKey) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      {
        status: 401,
        headers: {
          'Cache-Control': 'no-store',
          'WWW-Authenticate': 'Bearer',
        },
      }
    )
  }

  const expected = Buffer.from(apiKey, 'utf8')
  const provided = Buffer.from(providedKey, 'utf8')
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      {
        status: 401,
        headers: {
          'Cache-Control': 'no-store',
          'WWW-Authenticate': 'Bearer',
        },
      }
    )
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: orders, error } = await supabase
      .from('orders')
      .select('*, customer:profiles(id, full_name, email), items:order_items(*), status_history:order_status_history(*)')
      .eq('order_status', 'confirmed')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Confirmed orders API database error:', error)
      return NextResponse.json(
        { success: false, error: 'Could not retrieve confirmed orders' },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    const confirmedOrders = orders ?? []
    return NextResponse.json(
      {
        success: true,
        count: confirmedOrders.length,
        orders: confirmedOrders,
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('Confirmed orders API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
