import { Metadata } from "next"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import OrdersClient from "./orders-client"

export const metadata: Metadata = {
  title: "My Orders - Eskort",
  description: "View your order history",
}

export default async function OrdersPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login?redirect=/account/orders")
  }

  return <OrdersClient userId={user.id} />
}