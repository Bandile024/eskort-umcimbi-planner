import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import {
  getPayFastConfig,
  isPayFastRequest,
  mapPayFastStatus,
  toCents,
  validatePayFastNotification,
  verifyPayFastITNSignature,
} from "@/lib/payfast"

export async function POST(request: Request) {
  if (!isPayFastRequest(request.headers)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const body = await request.text()
    const params = new URLSearchParams(body)
    const fields: Record<string, string> = {}
    let duplicateField = false
    params.forEach((value, key) => {
      if (Object.prototype.hasOwnProperty.call(fields, key)) {
        duplicateField = true
        return
      }
      fields[key] = value
    })
    if (duplicateField) {
      return NextResponse.json({ error: "Duplicate ITN field" }, { status: 400 })
    }

    const config = getPayFastConfig()
    if (!verifyPayFastITNSignature(fields, fields.signature, config.passphrase)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 })
    }

    if (fields.merchant_id !== config.merchantId) {
      return NextResponse.json({ error: "Merchant ID mismatch" }, { status: 400 })
    }
    if (!fields.payment_status || !["COMPLETE", "PENDING", "FAILED", "CANCELLED", "REFUNDED"].includes(fields.payment_status)) {
      return NextResponse.json({ error: "Invalid payment status" }, { status: 400 })
    }

    const mPaymentId = fields.m_payment_id
    if (!mPaymentId) {
      return NextResponse.json({ error: "Missing m_payment_id" }, { status: 400 })
    }

    const grossAmount = fields.amount_gross
    if (!grossAmount) {
      return NextResponse.json({ error: "Missing amount_gross" }, { status: 400 })
    }
    const amountCents = toCents(grossAmount)

    const supabaseAdmin = createSupabaseAdminClient()
    const { data: transaction, error: txError } = await supabaseAdmin
      .from("payment_transactions")
      .select("order_id, amount_cents")
      .eq("payfast_m_payment_id", mPaymentId)
      .single()

    if (txError || !transaction) {
      console.error("PayFast transaction lookup failed:", txError)
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    if (amountCents !== Number(transaction.amount_cents)) {
      return NextResponse.json({ error: "Payment amount mismatch" }, { status: 400 })
    }

    if (!(await validatePayFastNotification(body))) {
      return NextResponse.json({ error: "PayFast notification validation failed" }, { status: 403 })
    }

    const status = mapPayFastStatus(fields.payment_status)
    const pfPaymentId = fields.pf_payment_id || null
    const { error: updateTransactionError } = await supabaseAdmin
      .from("payment_transactions")
      .update({
        payfast_pf_payment_id: pfPaymentId,
        payfast_payment_status: fields.payment_status,
        updated_at: new Date().toISOString(),
      })
      .eq("payfast_m_payment_id", mPaymentId)

    if (updateTransactionError) {
      console.error("PayFast transaction update failed:", updateTransactionError)
      return NextResponse.json({ error: "Failed to update payment transaction" }, { status: 500 })
    }

    if (status !== "pending") {
      const { data: order, error: orderLookupError } = await supabaseAdmin
        .from("orders")
        .select("order_status")
        .eq("id", transaction.order_id)
        .single()

      if (orderLookupError || !order) {
        console.error("PayFast order lookup failed:", orderLookupError)
        return NextResponse.json({ error: "Order not found" }, { status: 404 })
      }

      const orderUpdate: {
        payment_status: typeof status
        order_status?: string
        updated_at: string
      } = {
        payment_status: status,
        updated_at: new Date().toISOString(),
      }
      if (status === "paid" && order.order_status === "pending") {
        orderUpdate.order_status = "confirmed"
      }

      const { error: updateOrderError } = await supabaseAdmin
        .from("orders")
        .update(orderUpdate)
        .eq("id", transaction.order_id)

      if (updateOrderError) {
        console.error("PayFast order update failed:", updateOrderError)
        return NextResponse.json({ error: "Failed to update order" }, { status: 500 })
      }

    }

    return new NextResponse("OK", { status: 200 })
  } catch (error) {
    console.error("PayFast ITN processing failed:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
