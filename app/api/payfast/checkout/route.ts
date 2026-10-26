import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { createPayFastCheckout } from "@/lib/payfast"
import type { CreateOrderData } from "@/lib/types"

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json() as CreateOrderData
    const { items, customer_name, customer_email, customer_phone, delivery_address, delivery_fee, notes } = body

    if (!Array.isArray(items) || items.length === 0 || items.some((item) =>
      !item.product_name ||
      !Number.isInteger(item.quantity) ||
      item.quantity <= 0 ||
      !Number.isFinite(item.unit_price) ||
      item.unit_price < 0
    )) {
      return NextResponse.json({ error: "No items in order" }, { status: 400 })
    }
    if (!customer_name?.trim() || !customer_email?.trim() || !customer_phone?.trim() || !delivery_address?.trim()) {
      return NextResponse.json({ error: "Missing required customer information" }, { status: 400 })
    }
    if (delivery_fee !== undefined && (!Number.isFinite(delivery_fee) || delivery_fee < 0)) {
      return NextResponse.json({ error: "Invalid delivery fee" }, { status: 400 })
    }

    const now = new Date().toISOString().slice(0, 10).replace(/-/g, "")
    const orderNumber = `ESC-${now}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
    const deliveryFee = delivery_fee ?? 60
    const totalAmount = subtotal + deliveryFee
    const supabaseAdmin = createSupabaseAdminClient()

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_id: user.id,
        customer_name,
        customer_email,
        customer_phone,
        delivery_address,
        subtotal,
        delivery_fee: deliveryFee,
        total_amount: totalAmount,
        payment_status: "pending",
        order_status: "pending",
        notes: notes ?? null,
      })
      .select()
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
    }

    const { data: insertedItems, error: itemsError } = await supabaseAdmin
      .from("order_items")
      .insert(
        items.map((item) => ({
          order_id: order.id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: item.quantity * item.unit_price,
        }))
      )
      .select()

    if (itemsError || !insertedItems) {
      const { error: cleanupError } = await supabaseAdmin.from("orders").delete().eq("id", order.id)
      if (cleanupError) console.error("Failed to clean up incomplete PayFast order:", cleanupError)
      return NextResponse.json({ error: "Failed to create order items" }, { status: 500 })
    }

    let checkout: ReturnType<typeof createPayFastCheckout>
    try {
      checkout = createPayFastCheckout({
        customer: {
          name_first: customer_name.split(" ")[0] ?? "",
          name_last: customer_name.split(" ").slice(1).join(" ") ?? "",
          email_address: customer_email,
          cell_number: customer_phone,
        },
        order: {
          id: order.id,
          order_number: order.order_number,
          total_amount: order.total_amount,
        },
        request,
      })
    } catch (error) {
      const { error: cleanupError } = await supabaseAdmin.from("orders").delete().eq("id", order.id)
      if (cleanupError) console.error("Failed to clean up unpayable PayFast order:", cleanupError)
      throw error
    }

    const { error: payfastError } = await supabaseAdmin
      .from("payment_transactions")
      .insert({
        order_id: order.id,
        provider: "payfast",
        payfast_m_payment_id: order.id,
        amount_cents: Math.round(Number(order.total_amount) * 100),
      })

    if (payfastError) {
      console.error("PayFast transaction insert error:", payfastError)
      const { error: cleanupError } = await supabaseAdmin.from("orders").delete().eq("id", order.id)
      if (cleanupError) console.error("Failed to clean up incomplete PayFast order:", cleanupError)
      return NextResponse.json({ error: "Failed to prepare payment" }, { status: 500 })
    }

    return NextResponse.json({ url: checkout.url, fields: checkout.fields, orderId: order.id })
  } catch (error) {
    console.error("PayFast checkout error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}