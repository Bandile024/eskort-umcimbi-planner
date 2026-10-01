"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ChevronLeft, Package, Truck, CheckCircle, Clock, ChefHat } from "lucide-react"
import type { OrderWithItems } from "@/lib/types"

interface OrderDetailClientProps {
  orderId: string
}

const statusIcons: Record<string, JSX.Element> = {
  pending: <Clock className="w-5 h-5" />,
  confirmed: <CheckCircle className="w-5 h-5" />,
  processing: <ChefHat className="w-5 h-5" />,
  out_for_delivery: <Truck className="w-5 h-5" />,
  delivered: <CheckCircle className="w-5 h-5" />,
  cancelled: <Package className="w-5 h-5" />,
}

const statusLabels: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
}

const orderSteps = ["pending", "confirmed", "processing", "out_for_delivery", "delivered"]

export default function OrderDetailClient({ orderId }: OrderDetailClientProps) {
  const [order, setOrder] = useState<OrderWithItems | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchOrder()
  }, [orderId])

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/account/orders/${orderId}`)
      if (response.ok) {
        const data = await response.json()
        setOrder(data)
      } else if (response.status === 403) {
        setError("You don't have permission to view this order")
      } else {
        setError("Order not found")
      }
    } catch (error) {
      setError("Failed to load order")
    } finally {
      setLoading(false)
    }
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }).format(amount)
  }

  const getCurrentStepIndex = () => {
    if (!order) return 0
    return orderSteps.indexOf(order.order_status) === -1 ? 0 : orderSteps.indexOf(order.order_status)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-eskort-dark-bg">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 bg-gray-800/50 rounded" />
            <div className="h-4 w-24 bg-gray-800/50 rounded" />
            <div className="space-y-4">
              <div className="h-12 bg-gray-800/50 rounded-xl" />
              <div className="h-64 bg-gray-800/50 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-eskort-dark-bg">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Link
            href="/account/orders"
            className="inline-flex items-center gap-1 text-eskort-yellow text-sm font-semibold mb-8 hover:opacity-80"
          >
            <ChevronLeft size={16} />
            Back
          </Link>
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto text-gray-600 mb-4" />
            <h3 className="text-white font-semibold text-lg mb-2">{error || "Order not found"}</h3>
          </div>
        </div>
      </div>
    )
  }

  const currentStep = getCurrentStepIndex()

  return (
    <div className="min-h-screen bg-eskort-dark-bg">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href="/account/orders"
          className="inline-flex items-center gap-1 text-eskort-yellow text-sm font-semibold mb-8 hover:opacity-80"
        >
          <ChevronLeft size={16} />
          Back
        </Link>

        <div className="mb-8">
          <h1 className="font-display text-5xl md:text-6xl text-white tracking-wide leading-none">
            ORDER #{order.order_number}
          </h1>
          <p className="text-gray-500 text-sm mt-2">Placed on {formatDate(order.created_at)}</p>
        </div>

        <div className="bg-eskort-dark-card border border-gray-700 rounded-xl p-6 mb-6">
          <h2 className="text-white font-bold text-lg mb-4">Order Status</h2>
          <div className="flex items-center gap-2 mb-4 overflow-x-auto">
            {orderSteps.map((step, index) => {
              const isActive = index <= currentStep
              const isCurrent = index === currentStep

              return (
                <div
                  key={step}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg whitespace-nowrap text-sm font-medium ${
                    isActive
                      ? "bg-eskort-red/20 text-eskort-red border border-eskort-red/30"
                      : "bg-gray-800/30 text-gray-500 border border-gray-700"
                  }`}
                >
                  {isCurrent ? (
                    <>
                      {statusIcons[step]}
                      <span>{statusLabels[step]}</span>
                    </>
                  ) : isActive ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>{statusLabels[step]}</span>
                    </>
                  ) : (
                    <span>{statusLabels[step]}</span>
                  )}
                </div>
              )
            })}
          </div>

          {order.notes && (
            <div className="mt-4 p-3 bg-gray-800/30 border border-gray-700 rounded-lg">
              <p className="text-gray-300 text-sm">{order.notes}</p>
            </div>
          )}
        </div>

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
              <span>Total</span>
              <span>{formatCurrency(order.total_amount)}</span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-700 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Payment Status</span>
              <span className={`font-medium px-2 py-1 text-xs rounded ${
                order.payment_status === "paid"
                  ? "bg-green-900/30 text-green-400 border border-green-700"
                  : "bg-yellow-900/30 text-yellow-400 border border-yellow-700"
              }`}>
                {order.payment_status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Order Status</span>
              <span className="font-medium text-white">{statusLabels[order.order_status] || order.order_status}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}