export const ORDER_AUTH_MESSAGE = "Please sign in or create an account to place an order."

export function getSafeRedirect(value: string | null, fallback = "/"): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : fallback
}

export function getOrderLoginHref(returnTo: string): string {
  const params = new URLSearchParams({ redirect: getSafeRedirect(returnTo), reason: "order" })
  return `/login?${params.toString()}`
}

export function getOrderSignupHref(returnTo: string): string {
  const params = new URLSearchParams({ redirect: getSafeRedirect(returnTo), reason: "order" })
  return `/signup?${params.toString()}`
}