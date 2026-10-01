import { Metadata } from "next"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import AdminDashboardClient from "./dashboard-client"

export const metadata: Metadata = {
  title: "Admin Dashboard - Eskort",
  description: "Eskort admin dashboard - manage orders and view analytics",
}

export default async function AdminDashboardPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/admin/login?redirect=/admin/dashboard")
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin' || user.email?.toLowerCase() === 'admin@eskortstore.co.za'

  if (!isAdmin) {
    redirect("/")
  }

  if (profile?.role !== 'admin') {
    try {
      await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        role: 'admin',
        full_name: profile?.full_name || user.user_metadata?.full_name || 'Admin',
      })
    } catch (e) {
      console.warn('Failed to upsert admin profile:', e)
    }
  }

  return <AdminDashboardClient adminName={profile?.full_name || user.user_metadata?.full_name || 'Admin'} />
}