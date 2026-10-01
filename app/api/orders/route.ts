import { createServerSupabaseClient } from '@/lib/supabase-server'
import { orderService } from '@/lib/services/orderService'
import { sendOrderConfirmationEmail } from '@/lib/email'
import { NextResponse } from 'next/server'
import type { CreateOrderData } from '@/lib/types'

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { items, ...customerData } = body as CreateOrderData

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No items in order' }, { status: 400 })
    }

    if (!customerData.customer_name || !customerData.customer_email || !customerData.customer_phone || !customerData.delivery_address) {
      return NextResponse.json({ error: 'Missing required customer information' }, { status: 400 })
    }

    const order = await orderService.createOrder({
      ...customerData,
      items,
    }, user.id)

    if (!order) {
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

    // Send email notification
    await sendOrderConfirmationEmail({
      order_number: order.order_number,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      customer_phone: order.customer_phone,
      total_amount: order.total_amount,
    })

    // Clear the cart from localStorage would be done client-side
    // Return order details for client-side redirect
    return NextResponse.json({ 
      success: true, 
      order: {
        id: order.id,
        order_number: order.order_number,
        total_amount: order.total_amount,
      }
    })
  } catch (error) {
    console.error('Order API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}