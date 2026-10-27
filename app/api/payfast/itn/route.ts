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

export const runtime = "nodejs"

const logPrefix = "[PayFast ITN]"

export async function POST(request: Request) {
  const sourceIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown"

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

    const mPaymentId = fields.m_payment_id || "missing"
    console.info(`${logPrefix} Notification received`, {
      mPaymentId,
      paymentStatus: fields.payment_status || "missing",
      sourceIp,
    })

    if (!isPayFastRequest(request.headers)) {
      console.warn(`${logPrefix} Rejected source IP`, { mPaymentId, sourceIp })
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    if (duplicateField) {
      console.warn(`${logPrefix} Rejected duplicate notification field`, { mPaymentId })
      return NextResponse.json({ error: "Duplicate ITN field" }, { status: 400 })
    }

    const config = getPayFastConfig()
    if (!verifyPayFastITNSignature(fields, fields.signature, config.passphrase)) {
      console.warn(`${logPrefix} Signature validation failed`, { mPaymentId })
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 })
    }

    if (fields.merchant_id !== config.merchantId) {
      console.warn(`${logPrefix} Merchant ID mismatch`, { mPaymentId })
      return NextResponse.json({ error: "Merchant ID mismatch" }, { status: 400 })
    }

    const paymentStatus = fields.payment_status?.toUpperCase()
    if (!paymentStatus || !["COMPLETE", "PENDING", "FAILED", "CANCELLED", "REFUNDED"].includes(paymentStatus)) {
      console.warn(`${logPrefix} Invalid payment status`, { mPaymentId, paymentStatus: paymentStatus || "missing" })
      return NextResponse.json({ error: "Invalid payment status" }, { status: 400 })
    }

    if (!fields.m_payment_id) {
      console.warn(`${logPrefix} Notification missing m_payment_id`)
      return NextResponse.json({ error: "Missing m_payment_id" }, { status: 400 })
    }

    const pfPaymentId = fields.pf_payment_id?.trim()
    if (!pfPaymentId) {
      console.warn(`${logPrefix} Notification missing pf_payment_id`, { mPaymentId })
      return NextResponse.json({ error: "Missing pf_payment_id" }, { status: 400 })
    }

    const grossAmount = fields.amount_gross
    if (!grossAmount) {
      console.warn(`${logPrefix} Notification missing amount_gross`, { mPaymentId })
      return NextResponse.json({ error: "Missing amount_gross" }, { status: 400 })
    }

    let notificationIsValid = false
    try {
      notificationIsValid = await validatePayFastNotification(body)
    } catch (error) {
      console.error(`${logPrefix} PayFast server validation request failed`, {
        mPaymentId,
        error: error instanceof Error ? error.message : "Unknown error",
      })
      return NextResponse.json({ error: "PayFast validation request failed" }, { status: 502 })
    }
    if (!notificationIsValid) {
      console.warn(`${logPrefix} PayFast server validation failed`, { mPaymentId, paymentStatus })
      return NextResponse.json({ error: "PayFast notification validation failed" }, { status: 403 })
    }

    let amountCents: number
    try {
      amountCents = toCents(grossAmount)
    } catch {
      console.warn(`${logPrefix} Invalid gross amount`, { mPaymentId })
      return NextResponse.json({ error: "Invalid gross amount" }, { status: 400 })
    }
    const supabaseAdmin = createSupabaseAdminClient()
    const { data: transaction, error: txError } = await supabaseAdmin
      .from("payment_transactions")
      .select("order_id, amount_cents, payfast_payment_status")
      .eq("payfast_m_payment_id", mPaymentId)
      .maybeSingle()

    if (txError) {
      console.error(`${logPrefix} Transaction lookup failed`, { mPaymentId, error: txError.message })
      return NextResponse.json({ error: "Transaction lookup failed" }, { status: 500 })
    }
    if (!transaction) {
      console.error(`${logPrefix} No matching payment transaction`, { mPaymentId })
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    if (amountCents !== Number(transaction.amount_cents)) {
      console.error(`${logPrefix} Payment amount mismatch`, { mPaymentId })
      return NextResponse.json({ error: "Payment amount mismatch" }, { status: 400 })
    }

    const storedGatewayStatus = transaction.payfast_payment_status?.toUpperCase()
    if (storedGatewayStatus === "COMPLETE" && paymentStatus !== "COMPLETE") {
      console.info(`${logPrefix} Ignored stale notification after COMPLETE`, { mPaymentId, paymentStatus })
      return new NextResponse("OK", { status: 200 })
    }

    const { data: updatedTransaction, error: updateTransactionError } = await supabaseAdmin
      .from("payment_transactions")
      .update({
        payfast_pf_payment_id: pfPaymentId,
        payfast_payment_status: paymentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("payfast_m_payment_id", mPaymentId)
      .select("id")
      .maybeSingle()

    if (updateTransactionError) {
      console.error(`${logPrefix} Payment transaction update failed`, {
        mPaymentId,
        error: updateTransactionError.message,
      })
      return NextResponse.json({ error: "Failed to update payment transaction" }, { status: 500 })
    }
    if (!updatedTransaction) {
      console.error(`${logPrefix} Payment transaction disappeared before update`, { mPaymentId })
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    const status = mapPayFastStatus(paymentStatus)
    if (status !== "pending") {
      const { data: order, error: orderLookupError } = await supabaseAdmin
        .from("orders")
        .select("order_status")
        .eq("id", transaction.order_id)
        .maybeSingle()

      if (orderLookupError) {
        console.error(`${logPrefix} Order lookup failed`, {
          mPaymentId,
          orderId: transaction.order_id,
          error: orderLookupError.message,
        })
        return NextResponse.json({ error: "Order lookup failed" }, { status: 500 })
      }
      if (!order) {
        console.error(`${logPrefix} Related order not found`, { mPaymentId, orderId: transaction.order_id })
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
        console.error(`${logPrefix} Order update failed`, {
          mPaymentId,
          orderId: transaction.order_id,
          error: updateOrderError.message,
        })
        return NextResponse.json({ error: "Failed to update order" }, { status: 500 })
      }
    }

    console.info(`${logPrefix} Notification processed`, {
      mPaymentId,
      pfPaymentId,
      paymentStatus,
      orderId: transaction.order_id,
    })
    return new NextResponse("OK", { status: 200 })
  } catch (error) {
    console.error(`${logPrefix} Processing failed`, {
      error: error instanceof Error ? error.message : "Unknown error",
    })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
