import { createServerSupabaseClient } from '@/lib/supabase-server'
import { orderService } from '@/lib/services/orderService'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orders = await orderService.getUserOrders(user.id, supabase)
    return NextResponse.json(orders)
  } catch (error) {
    console.error('User orders API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}