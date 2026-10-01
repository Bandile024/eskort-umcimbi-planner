import { Metadata } from "next"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import AdminOrdersClient from "./orders-client"

export const metadata: Metadata = {
  title: "Orders - Admin Dashboard | Eskort",
  description: "Manage all Eskort orders",
}

export default async function AdminOrdersPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/admin/login?redirect=/admin/orders")
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin' || user.email?.toLowerCase() === 'admin@eskortstore.co.za'

  if (!isAdmin) {
    redirect("/")
  }

  return <AdminOrdersClient />
}