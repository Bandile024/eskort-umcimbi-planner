import { Metadata } from "next"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect, notFound } from "next/navigation"
import AdminOrderDetailClient from "./order-detail-client"

export const metadata: Metadata = {
  title: "Order Details - Admin Dashboard | Eskort",
  description: "View and manage order details",
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/admin/login?redirect=/admin/orders")
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect("/")
  }

  const { id } = await params

  return <AdminOrderDetailClient orderId={id} />
}