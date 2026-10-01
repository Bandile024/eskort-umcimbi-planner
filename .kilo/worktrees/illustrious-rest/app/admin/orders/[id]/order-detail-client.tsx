"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ChevronLeft, Package, Save, X } from "lucide-react"
import type { OrderWithItems } from "@/lib/types"

interface AdminOrderDetailClientProps {
  orderId: string
}

const orderStatusOptions = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
]

const paymentStatusOptions = [
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
]

export default function AdminOrderDetailClient({ orderId }: AdminOrderDetailClientProps) {
  const [order, setOrder] = useState<OrderWithItems | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [internalNote, setInternalNote] = useState("")

  const fetchOrder = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`)
      if (response.ok) {
        const data = await response.json()
        setOrder(data)
      } else {
        setError("Order not found")
      }
    } catch (error) {
      setError("Failed to load order")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrder()
  }, [orderId])

  const updateOrderStatus = async (newStatus: string, note?: string) => {
    setSaving(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          new_status: newStatus,
          notes: note && note.trim() ? note : undefined,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setOrder(data)
        setSuccess("Order status updated successfully")
        setTimeout(() => setSuccess(""), 3000)
      } else {
        const data = await response.json()
        setError(data.error || "Failed to update status")
      }
    } catch (error) {
      setError("Failed to update status")
    } finally {
      setSaving(false)
    }
  }

  const updatePaymentStatus = async (paymentStatus: string) => {
    setSaving(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_status: paymentStatus }),
      })

      if (response.ok) {
        const data = await response.json()
        setOrder(data)
        setSuccess("Payment status updated successfully")
        setTimeout(() => setSuccess(""), 3000)
      } else {
        const data = await response.json()
        setError(data.error || "Failed to update payment status")
      }
    } catch (error) {
      setError("Failed to update payment status")
    } finally {
      setSaving(false)
    }
  }

  const handleSaveNote = async () => {
    if (!order || !internalNote.trim()) return
    await updateOrderStatus(order.order_status, internalNote)
    setInternalNote("")
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-eskort-dark-bg">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 bg-gray-800/50 rounded" />
            <div className="h-4 w-24 bg-gray-800/50 rounded" />
            <div className="h-4 w-full bg-gray-800/50 rounded-xl" />
            <div className="h-4 w-full bg-gray-800/50 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-eskort-dark-bg">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1 text-eskort-yellow text-sm font-semibold mb-8 hover:opacity-80"
          >
            <ChevronLeft size={16} />
            Back
          </Link>
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto text-gray-600 mb-4" />
            <p className="text-gray-500">{error || "Order not found"}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-eskort-dark-bg">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1 text-eskort-yellow text-sm font-semibold mb-8 hover:opacity-80"
        >
          <ChevronLeft size={16} />
          Back
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-5xl md:text-6xl text-white tracking-wide leading-none">
              Order #{order.order_number}
            </h1>
            <p className="text-gray-500 text-sm mt-2">Placed on {formatDate(order.created_at)}</p>
          </div>
          <button
            onClick={fetchOrder}
            className="p-2 bg-eskort-dark-card border border-gray-700 rounded-lg text-gray-300 hover:text-white transition-colors"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-900/30 border border-green-700 text-green-300 px-4 py-3 rounded-lg text-sm mb-4">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-eskort-dark-card border border-gray-700 rounded-xl p-6">
            <h2 className="text-white font-bold text-lg mb-4">Customer Information</h2>
            <div className="space-y-3">
              <div>
                <span className="text-gray-500 text-xs uppercase tracking-wide">Name</span>
                <p className="text-white font-medium">{order.customer_name}</p>
              </div>
              <div>
                <span className="text-gray-500 text-xs uppercase tracking-wide">Email</span>
                <p className="text-white font-medium">{order.customer_email}</p>
              </div>
              <div>
                <span className="text-gray-500 text-xs uppercase tracking-wide">Phone</span>
                <p className="text-white font-medium">{order.customer_phone}</p>
              </div>
            </div>
          </div>

          <div className="bg-eskort-dark-card border border-gray-700 rounded-xl p-6">
            <h2 className="text-white font-bold text-lg mb-4">Delivery Address</h2>
            <div>
              <span className="text-gray-500 text-xs uppercase tracking-wide">Address</span>
              <p className="text-white font-medium mt-1">{order.delivery_address}</p>
            </div>
          </div>
        </div>

        <div className="bg-eskort-dark-card border border-gray-700 rounded-xl p-6 mb-6">
          <h2 className="text-white font-bold text-lg mb-4">Ordered Products</h2>
          <div className="space-y-4">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 py-3 border-b border-gray-700 last:border-b-0"
              >
                <div>
                  <p className="text-white font-medium">{item.product_name}</p>
                  <p className="text-gray-500 text-sm">
                    {item.quantity} × {formatCurrency(item.unit_price)}
                  </p>
                </div>
                <p className="font-bold text-white">{formatCurrency(item.line_total)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-eskort-dark-card border border-gray-700 rounded-xl p-6">
            <h2 className="text-white font-bold text-lg mb-4">Totals</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Delivery</span>
                <span>{formatCurrency(order.delivery_fee)}</span>
              </div>
              <div className="flex justify-between text-white font-bold text-xl border-t border-gray-700 pt-3">
                <span>Grand Total</span>
                <span>{formatCurrency(order.total_amount)}</span>
              </div>
            </div>
          </div>

          <div className="bg-eskort-dark-card border border-gray-700 rounded-xl p-6">
            <h2 className="text-white font-bold text-lg mb-4">Payment Status</h2>
            <select
              value={order.payment_status}
              onChange={(e) => updatePaymentStatus(e.target.value)}
              disabled={saving}
              className="w-full bg-eskort-dark-bg border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-eskort-yellow transition-colors disabled:opacity-50"
            >
              {paymentStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-eskort-dark-card border border-gray-700 rounded-xl p-6">
            <h2 className="text-white font-bold text-lg mb-4">Order Status</h2>
            <select
              value={order.order_status}
              onChange={(e) => updateOrderStatus(e.target.value, order.notes ?? undefined)}
              disabled={saving}
              className="w-full bg-eskort-dark-bg border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-eskort-yellow transition-colors disabled:opacity-50 mb-4"
            >
              {orderStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-eskort-dark-card border border-gray-700 rounded-xl p-6 mb-6">
          <h2 className="text-white font-bold text-lg mb-4">Order Timeline</h2>
          <div className="space-y-3">
            {order.status_history.map((history) => (
              <div key={history.id} className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-eskort-red rounded-full" />
                <span className="text-gray-400">
                  {formatDate(history.created_at)}
                </span>
                <span className="text-white">
                  {history.previous_status ? `${history.previous_status.replace("_", " ")} → ` : ""}
                  <span className="text-eskort-yellow">{history.new_status.replace("_", " ")}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-eskort-dark-card border border-gray-700 rounded-xl p-6">
          <h2 className="text-white font-bold text-lg mb-4">Internal Notes</h2>
          <div className="space-y-3 mb-4">
            <div className="text-sm text-gray-400">
              {order.notes ? <p>{order.notes}</p> : <p className="text-gray-600">No internal notes added yet.</p>}
            </div>
          </div>
          <div className="flex gap-2">
            <textarea
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              placeholder="Add a note..."
              className="flex-1 bg-eskort-dark-bg border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-eskort-yellow transition-colors"
              rows={3}
            />
            <button
              onClick={handleSaveNote}
              disabled={saving || !internalNote.trim()}
              className="px-4 py-2 bg-eskort-red text-white rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save size={16} />
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}