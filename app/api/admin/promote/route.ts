import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow admin users to promote others
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Find target user by email in profiles table
    const { data: targetProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (profileError || !targetProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update the target user's profile to admin
    const { error: updateError } = await supabase
      .from('profiles')
      .upsert({
        id: targetProfile.id,
        email: email,
        role: 'admin',
      })

    if (updateError) {
      console.error('Promote to admin error:', updateError)
      return NextResponse.json({ error: 'Failed to promote user' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: `User ${email} promoted to admin` })
  } catch (error) {
    console.error('Promote admin error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}