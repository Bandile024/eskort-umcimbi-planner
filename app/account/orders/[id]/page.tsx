import { Metadata } from "next"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { notFound } from "next/navigation"
import OrderDetailClient from "./order-detail-client"

export const metadata: Metadata = {
  title: "Order Details - Eskort",
  description: "View your order details",
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login?redirect=/account/orders")
  }

  const { id } = await params
  
  const { data: order } = await supabase
    .from('orders')
    .select(`
      *,
      items:order_items (
        id,
        product_name,
        quantity,
        unit_price,
        line_total
      )
    `)
    .eq('id', id)
    .single()

  if (!order) {
    notFound()
  }

  if (order.customer_id !== user.id) {
    notFound()
  }

  return <OrderDetailClient order={order} />
}