import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const supabase = createServerSupabaseClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', role: 'customer' }, { status: 401 })
    }

    const isAdminEmail = user.email?.toLowerCase() === 'admin@eskortstore.co.za'

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (isAdminEmail || profile?.role === 'admin') {
      if (profile?.role !== 'admin') {
        try {
          await supabase.from('profiles').upsert({
            id: user.id,
            email: user.email,
            role: 'admin',
            full_name: user.user_metadata?.full_name || 'Admin',
          })
        } catch (e) {
          console.warn('Failed to upsert admin profile:', e)
        }
      }
      return NextResponse.json({ role: 'admin' })
    }

    if (error || !profile) {
      return NextResponse.json({ role: 'customer' })
    }

    return NextResponse.json({ role: profile.role })
  } catch (error) {
    console.error('Check role error:', error)
    return NextResponse.json({ error: 'Internal server error', role: 'customer' }, { status: 500 })
  }
}