import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const supabase = createServerSupabaseClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdminEmail = user.email?.toLowerCase() === 'admin@eskortstore.co.za'

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!isAdminEmail && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (profile?.role !== 'admin') {
      try {
        await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            email: user.email,
            role: 'admin',
            full_name: user.user_metadata?.full_name || 'Admin',
          })
      } catch (e) {
        console.warn('Failed to upsert admin profile:', e)
      }
    }

    return NextResponse.json({ success: true, role: 'admin' })
  } catch (error) {
    console.error('Check admin error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}