"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ChevronLeft, Package } from "lucide-react"
import type { OrderWithItems } from "@/lib/types"

interface OrdersClientProps {
  userId: string
}

export default function OrdersClient({ userId }: OrdersClientProps) {
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const response = await fetch("/api/account/orders")
      if (response.ok) {
        const data = await response.json()
        setOrders(data)
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-green-900/30 text-green-400 border-green-700"
      case "processing":
        return "bg-yellow-900/30 text-yellow-400 border-yellow-700"
      case "confirmed":
        return "bg-blue-900/30 text-blue-400 border-blue-700"
      case "out_for_delivery":
        return "bg-purple-900/30 text-purple-400 border-purple-700"
      case "cancelled":
        return "bg-red-900/30 text-red-400 border-red-700"
      default:
        return "bg-gray-900/30 text-gray-400 border-gray-700"
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-900/30 text-green-400 border-green-700"
      case "pending":
        return "bg-yellow-900/30 text-yellow-400 border-yellow-700"
      case "failed":
        return "bg-red-900/30 text-red-400 border-red-700"
      case "refunded":
        return "bg-blue-900/30 text-blue-400 border-blue-700"
      default:
        return "bg-gray-900/30 text-gray-400 border-gray-700"
    }
  }

  return (
    <div className="min-h-screen bg-eskort-dark-bg">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href="/account"
          className="inline-flex items-center gap-1 text-eskort-yellow text-sm font-semibold mb-8 hover:opacity-80"
        >
          <ChevronLeft size={16} />
          Back
        </Link>

        <div className="mb-8">
          <h1 className="font-display text-5xl md:text-6xl text-white tracking-wide leading-none">
            MY ORDERS
          </h1>
          <p className="text-gray-500 text-sm mt-2">View your order history and track deliveries</p>
        </div>

        <div className="bg-eskort-dark-card border border-gray-700 rounded-xl p-6">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-20 bg-gray-800/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 mx-auto text-gray-600 mb-4" />
              <h3 className="text-white font-semibold text-lg mb-2">No orders yet</h3>
              <p className="text-gray-500 mb-6">Start planning your braai and place your first order</p>
              <Link
                href="/build-my-braai"
                className="btn-primary inline-flex py-2.5 px-6"
              >
                Build My Braai
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/account/orders/${order.id}`}
                  className="block p-4 bg-gray-900/30 border border-gray-700 rounded-xl hover:border-eskort-yellow/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-2">
                        <span className="font-bold text-white">Order {order.order_number}</span>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(order.order_status)}`}>
                          {order.order_status.replace("_", " ")}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getPaymentStatusColor(order.payment_status)}`}>
                          {order.payment_status}
                        </span>
                      </div>
                      <p className="text-gray-500 text-sm">{formatDate(order.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-2xl text-eskort-red">{formatCurrency(order.total_amount)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}