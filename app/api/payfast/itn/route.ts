import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { isPayFastRequest, verifyPayFastSignature, mapPayFastStatus } from "@/lib/payfast"

export async function POST(request: Request) {
  if (!isPayFastRequest(request.headers)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const body = await request.text()
  const params = new URLSearchParams(body)
  const fields: Record<string, unknown> = Object.fromEntries(params.entries())

  const signature = typeof fields.signature === "string" ? fields.signature : null
  if (!verifyPayFastSignature(fields, signature, process.env.PAYFAST_PASSPHRASE)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 })
  }

  const mPaymentId = typeof fields.m_payment_id === "string" ? fields.m_payment_id : null
  const pfPaymentId = typeof fields.pf_payment_id === "string" ? fields.pf_payment_id : null

  if (!mPaymentId) {
    return NextResponse.json({ error: "Missing m_payment_id" }, { status: 400 })
  }

  const supabaseAdmin = createSupabaseAdminClient()
  const status = mapPayFastStatus(fields.payment_status as string | undefined)

  const { data: transaction, error: txError } = await supabaseAdmin
    .from("payment_transactions")
    .select("order_id")
    .eq("payfast_m_payment_id", mPaymentId)
    .single()

  if (txError || !transaction) {
    console.error("Transaction lookup failed:", txError)
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
  }

  await supabaseAdmin
    .from("payment_transactions")
    .update({
      payfast_pf_payment_id: pfPaymentId,
      payfast_payment_status: fields.payment_status,
      updated_at: new Date().toISOString(),
    })
    .eq("payfast_m_payment_id", mPaymentId)

  if (status === "paid") {
    await supabaseAdmin
      .from("orders")
      .update({ payment_status: "paid", order_status: "confirmed", updated_at: new Date().toISOString() })
      .eq("id", transaction.order_id)
  } else if (status === "failed" || status === "refunded") {
    await supabaseAdmin
      .from("orders")
      .update({ payment_status: status, updated_at: new Date().toISOString() })
      .eq("id", transaction.order_id)
  }

  return new NextResponse("OK", { status: 200 })
}