import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = createServerSupabaseClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', role: 'customer' }, { status: 401 })
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (error || !profile) {
      return NextResponse.json({ role: 'customer' })
    }

    return NextResponse.json({ role: profile.role })
  } catch (error) {
    console.error('Check role error:', error)
    return NextResponse.json({ error: 'Internal server error', role: 'customer' }, { status: 500 })
  }
}