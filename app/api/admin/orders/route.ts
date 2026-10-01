import { createServerSupabaseClient } from '@/lib/supabase-server'
import { orderService } from '@/lib/services/orderService'
import { NextResponse } from 'next/server'
import type { AdminOrderFilters } from '@/lib/types'

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const filters: AdminOrderFilters = {
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') as any || 'all',
      payment_status: searchParams.get('payment_status') as any || 'all',
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      sort: (searchParams.get('sort') as any) || 'newest',
    }

    const result = await orderService.getAllOrdersAdmin(filters, supabase)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Admin orders API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}