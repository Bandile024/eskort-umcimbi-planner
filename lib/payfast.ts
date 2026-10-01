import { createHash, timingSafeEqual } from "crypto"
import type { Order } from "@/lib/types"

export type PayFastMode = "sandbox" | "live"
export type PayFastGatewayStatus = "COMPLETE" | "PENDING" | "FAILED" | "CANCELLED"
export type PayFastPaymentStatus = "pending" | "paid" | "failed" | "refunded"

export interface PayFastCustomer {
  name_first?: string | null
  name_last?: string | null
  email_address?: string | null
  cell_number?: string | null
}

export interface PayFastCheckoutResult {
  url: string
  fields: Record<string, string>
}

interface PayFastConfig {
  mode: PayFastMode
  merchantId: string
  merchantKey: string
  passphrase?: string
  checkoutUrl: string
  validateUrl: string
}

// Canonical parameter ordering according to official PayFast documentation
const PAYFAST_CANONICAL_ORDER = [
  "merchant_id",
  "merchant_key",
  "return_url",
  "cancel_url",
  "notify_url",
  "name_first",
  "name_last",
  "email_address",
  "cell_number",
  "m_payment_id",
  "amount",
  "item_name",
  "item_description",
  "custom_int1",
  "custom_int2",
  "custom_int3",
  "custom_int4",
  "custom_int5",
  "custom_str1",
  "custom_str2",
  "custom_str3",
  "custom_str4",
  "custom_str5",
  "email_confirmation",
  "confirmation_address",
  "payment_method",
]

const payFastIpRanges = [
  "197.97.145.144/28",
  "41.74.179.192/27",
  "102.216.36.0/28",
  "102.216.36.128/28",
  "144.126.193.139",
]

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export function getPayFastConfig(): PayFastConfig {
  const mode = process.env.PAYFAST_MODE === "live" ? "live" : "sandbox"
  const host = mode === "live" ? "www.payfast.co.za" : "sandbox.payfast.co.za"
  const rawPassphrase = process.env.PAYFAST_PASSPHRASE?.trim()

  return {
    mode,
    merchantId: requiredEnv("PAYFAST_MERCHANT_ID").trim(),
    merchantKey: requiredEnv("PAYFAST_MERCHANT_KEY").trim(),
    passphrase: rawPassphrase && rawPassphrase.length > 0 ? rawPassphrase : undefined,
    checkoutUrl: `https://${host}/eng/process`,
    validateUrl: `https://${host}/eng/query/validate`,
  }
}

export function getPublicOrigin(request?: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "")
  if (configured) {
    return configured
  }

  if (request) {
    const host = request.headers.get("host") || "localhost"
    const protocol = host.includes("localhost") ? "http" : "https"
    return `${protocol}://${host}`
  }

  throw new Error("NEXT_PUBLIC_SITE_URL is required for PayFast callbacks")
}

export function toCents(value: number | string): number {
  const normalized = String(value).trim()
  const match = normalized.match(/^(\d+)(?:\.(\d{0,2}))?$/)

  if (!match) {
    throw new Error("Invalid PayFast amount")
  }

  const whole = Number(match[1])
  const fraction = (match[2] || "").padEnd(2, "0")
  return whole * 100 + Number(fraction)
}

export function formatAmount(cents: number): string {
  return (cents / 100).toFixed(2)
}

/**
 * PayFast PHP urlencode() standard:
 * RFC 1738 encoding where spaces are encoded as '+' and standard safe chars remain unencoded.
 */
function encodePayFastValue(value: unknown): string {
  return encodeURIComponent(String(value).trim()).replace(/%20/g, "+")
}

/**
 * Builds the canonical, sorted query string for PayFast MD5 hashing.
 */
export function signatureString(fields: Record<string, unknown>, passphrase?: string): string {
  // 1. Filter out signature and any undefined, null, or whitespace-only keys
  const keys = Object.keys(fields).filter(
    (key) =>
      key !== "signature" &&
      fields[key] !== undefined &&
      fields[key] !== null &&
      String(fields[key]).trim() !== ""
  )

  // 2. Sort according to PayFast canonical specifications
  keys.sort((a, b) => {
    const idxA = PAYFAST_CANONICAL_ORDER.indexOf(a)
    const idxB = PAYFAST_CANONICAL_ORDER.indexOf(b)
    if (idxA !== -1 && idxB !== -1) return idxA - idxB
    if (idxA !== -1) return -1
    if (idxB !== -1) return 1
    return a.localeCompare(b)
  })

  // 3. Construct name=value pairs
  const pairs = keys.map((key) => `${key}=${encodePayFastValue(fields[key])}`)
  let queryString = pairs.join("&")

  // 4. Append passphrase if configured
  const cleanPassphrase = passphrase?.trim()
  if (cleanPassphrase && cleanPassphrase.length > 0) {
    queryString += `&passphrase=${encodePayFastValue(cleanPassphrase)}`
  }

  return queryString
}

export function signPayFastFields(fields: Record<string, unknown>, passphrase?: string): string {
  return createHash("md5").update(signatureString(fields, passphrase)).digest("hex")
}

export function verifyPayFastSignature(
  fields: Record<string, unknown>,
  signature?: string | null,
  passphrase?: string
): boolean {
  if (!signature) {
    return false
  }

  const expected = signPayFastFields(fields, passphrase)
  if (expected.length !== signature.length) {
    return false
  }

  const expectedBuffer = Buffer.from(expected.toLowerCase(), "hex")
  const signatureBuffer = Buffer.from(signature.toLowerCase(), "hex")
  return timingSafeEqual(expectedBuffer, signatureBuffer)
}

/**
 * Validates the notification directly with PayFast validate endpoint.
 * The body must be the raw parameter string, with the Host header specified.
 */
export async function validatePayFastNotification(
  fields: Record<string, unknown>,
  passphrase?: string
): Promise<boolean> {
  const host = process.env.PAYFAST_MODE === "live" ? "www.payfast.co.za" : "sandbox.payfast.co.za"
  
  // Format received fields as application/x-www-form-urlencoded
  const pairs = Object.entries(fields)
    .filter(([key, val]) => val !== undefined && val !== null && String(val).trim() !== "")
    .map(([key, val]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`)
  const bodyString = pairs.join("&")

  const response = await fetch(`https://${host}/eng/query/validate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Host": host,
    },
    body: bodyString,
  })

  return response.ok && (await response.text()).trim() === "VALID"
}

function ipv4ToNumber(ip: string): number | null {
  const parts = ip.split(".")
  if (parts.length !== 4 || parts.some((part) => !/^\d+$/.test(part) || Number(part) > 255)) {
    return null
  }

  return parts.reduce((result, part) => result * 256 + Number(part), 0)
}

function ipMatchesRange(ip: string, range: string): boolean {
  const [rangeIp, prefixText] = range.split("/")
  const address = ipv4ToNumber(ip)
  const network = ipv4ToNumber(rangeIp)
  if (address === null || network === null) {
    return false
  }

  if (!prefixText) {
    return address === network
  }

  const prefix = Number(prefixText)
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
  return ((address ^ network) & mask) === 0
}

export function isPayFastRequest(headers: Headers): boolean {
  if (process.env.PAYFAST_SKIP_IP_CHECK === "true" && process.env.NODE_ENV !== "production") {
    return true
  }

  const forwardedFor = headers.get("x-forwarded-for")
  const ip = forwardedFor?.split(",")[0]?.trim() || headers.get("x-real-ip") || ""
  return payFastIpRanges.some((range) => ipMatchesRange(ip, range))
}

export function mapPayFastStatus(status?: string | null): PayFastPaymentStatus {
  switch (status?.toUpperCase()) {
    case "COMPLETE":
      return "paid"
    case "FAILED":
    case "CANCELLED":
      return "failed"
    case "REFUNDED":
      return "refunded"
    default:
      return "pending"
  }
}

export function createPayFastCheckout(input: {
  order: Pick<Order, "id" | "order_number" | "total_amount">
  customer: PayFastCustomer
  request?: Request
}): PayFastCheckoutResult {
  const config = getPayFastConfig()
  const origin = getPublicOrigin(input.request)
  const amountCents = toCents(input.order.total_amount)

  // Build raw payload dictionary
  const rawFields: Record<string, string | undefined> = {
    merchant_id: config.merchantId,
    merchant_key: config.merchantKey,
    return_url: `${origin}/order-confirmation?order_id=${input.order.id}`,
    cancel_url: `${origin}/checkout?payment=cancelled`,
    notify_url: `${origin}/api/payfast/itn`,
    name_first: input.customer.name_first?.trim() || undefined,
    name_last: input.customer.name_last?.trim() || undefined,
    email_address: input.customer.email_address?.trim() || undefined,
    cell_number: input.customer.cell_number?.trim() || undefined,
    m_payment_id: String(input.order.id).trim(),
    amount: formatAmount(amountCents),
    item_name: `Eskort Order ${input.order.order_number}`.trim(),
    item_description: `Order ${input.order.order_number}`.trim(),
    custom_str1: String(input.order.id).trim(),
    custom_int1: "1",
  }

  // Prune any undefined or empty fields so the form only submits what was hashed
  const fields: Record<string, string> = {}
  for (const [key, value] of Object.entries(rawFields)) {
    if (value !== undefined && value !== null && value.trim() !== "") {
      fields[key] = value.trim()
    }
  }

  // Calculate matching MD5 signature
  fields.signature = signPayFastFields(fields, config.passphrase)

  return {
    url: config.checkoutUrl,
    fields,
  }
}

export function debugPayFastSignature(input: {
  order: Pick<Order, "id" | "order_number" | "total_amount">
  customer: PayFastCustomer
  request?: Request
}): { signatureString: string; fields: Record<string, string>; passphrase?: string } {
  const checkout = createPayFastCheckout(input)
  const config = getPayFastConfig()
  const sigStr = signatureString(checkout.fields, config.passphrase)

  if (process.env.NODE_ENV !== "production") {
    console.log("[PayFast Debug] Clean Fields:", JSON.stringify(checkout.fields, null, 2))
    console.log("[PayFast Debug] Pre-hash string:", sigStr)
    console.log("[PayFast Debug] Passphrase active:", config.passphrase ? "yes" : "no")
    console.log("[PayFast Debug] Generated signature:", checkout.fields.signature)
  }

  return {
    signatureString: sigStr,
    fields: checkout.fields,
    passphrase: config.passphrase,
  }
}