import { createServerSupabaseClient } from '@/lib/supabase-server'
import { orderService } from '@/lib/services/orderService'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerSupabaseClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const order = await orderService.getOrderById(id, supabase)

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('Admin order detail API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerSupabaseClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    
    if (body.new_status) {
      const success = await orderService.updateOrderStatus({
        order_id: id,
        new_status: body.new_status,
        notes: body.notes,
      }, supabase)
      if (!success) {
        return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 })
      }
    }

    if (body.payment_status) {
      const success = await orderService.updatePaymentStatus({
        order_id: id,
        payment_status: body.payment_status,
      }, supabase)
      if (!success) {
        return NextResponse.json({ error: 'Failed to update payment status' }, { status: 500 })
      }
    }

    const order = await orderService.getOrderById(id, supabase)
    return NextResponse.json(order)
  } catch (error) {
    console.error('Admin order update API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}