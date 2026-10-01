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

  if (profile?.role !== 'admin') {
    redirect("/")
  }

  return <AdminDashboardClient adminName={profile.full_name} />
}