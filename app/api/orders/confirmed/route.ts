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
      .select('*')
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
    if (confirmedOrders.length === 0) {
      return NextResponse.json(
        { success: true, count: 0, orders: [] },
        { status: 200, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    const orderIds = confirmedOrders.map((order) => order.id)
    const customerIds = Array.from(
      new Set(
        confirmedOrders
          .map((order) => order.customer_id)
          .filter((id): id is string => typeof id === 'string')
      )
    )

    const [itemsResult, historyResult] = await Promise.all([
      supabase.from('order_items').select('*').in('order_id', orderIds),
      supabase.from('order_status_history').select('*').in('order_id', orderIds).order('created_at'),
    ])

    if (itemsResult.error || historyResult.error) {
      console.error('Confirmed orders API related data error:', itemsResult.error ?? historyResult.error)
      return NextResponse.json(
        { success: false, error: 'Could not retrieve confirmed order details' },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    let customers: { id: string; full_name: string | null; email: string }[] = []
    if (customerIds.length > 0) {
      const { data, error: customersError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', customerIds)

      if (customersError) {
        console.error('Confirmed orders API customer data error:', customersError)
        return NextResponse.json(
          { success: false, error: 'Could not retrieve confirmed order customer details' },
          { status: 500, headers: { 'Cache-Control': 'no-store' } }
        )
      }

      customers = data ?? []
    }

    const customersById = new Map(customers.map((customer) => [customer.id, customer]))
    const itemsByOrderId = new Map<string, typeof itemsResult.data>()
    for (const item of itemsResult.data ?? []) {
      const orderItems = itemsByOrderId.get(item.order_id) ?? []
      orderItems.push(item)
      itemsByOrderId.set(item.order_id, orderItems)
    }

    const historyByOrderId = new Map<string, typeof historyResult.data>()
    for (const entry of historyResult.data ?? []) {
      const orderHistory = historyByOrderId.get(entry.order_id) ?? []
      orderHistory.push(entry)
      historyByOrderId.set(entry.order_id, orderHistory)
    }

    const ordersWithDetails = confirmedOrders.map((order) => ({
      ...order,
      customer: order.customer_id ? customersById.get(order.customer_id) ?? null : null,
      items: itemsByOrderId.get(order.id) ?? [],
      status_history: historyByOrderId.get(order.id) ?? [],
    }))

    return NextResponse.json(
      {
        success: true,
        count: ordersWithDetails.length,
        orders: ordersWithDetails,
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
