"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { ChevronLeft, Package, Truck, AlertCircle, CheckCircle, XCircle, Clock } from "lucide-react"

interface Order {
  id: string
  order_number: string
  customer_name: string
  customer_email: string
  customer_phone: string
  delivery_address: string
  subtotal: number
  delivery_fee: number
  total_amount: number
  payment_status: string
  order_status: string
  notes: string | null
  created_at: string
  updated_at: string
  items: OrderItem[]
}

interface OrderItem {
  id: string
  product_name: string
  quantity: number
  unit_price: number
  line_total: number
}

export default function OrderDetailClient({ order }: { order: Order }) {
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "PPP")
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      pending: { label: "Pending", className: "bg-yellow-900/30 text-yellow-400" },
      confirmed: { label: "Confirmed", className: "bg-green-900/30 text-green-400" },
      preparing: { label: "Preparing", className: "bg-blue-900/30 text-blue-400" },
      shipped: { label: "Shipped", className: "bg-purple-900/30 text-purple-400" },
      delivered: { label: "Delivered", className: "bg-emerald-900/30 text-emerald-400" },
      cancelled: { label: "Cancelled", className: "bg-red-900/30 text-red-400" },
    }
    return statusMap[status] || { label: status, className: "bg-gray-700 text-gray-400" }
  }

  const getPaymentStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      pending: { label: "Pending", className: "bg-yellow-900/30 text-yellow-400" },
      paid: { label: "Paid", className: "bg-green-900/30 text-green-400" },
      failed: { label: "Failed", className: "bg-red-900/30 text-red-400" },
      refunded: { label: "Refunded", className: "bg-blue-900/30 text-blue-400" },
    }
    return statusMap[status] || { label: status, className: "bg-gray-700 text-gray-400" }
  }

  return (
    <div className="min-h-screen bg-eskort-dark-bg">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Back */}
        <Link
          href="/account/orders"
          className="inline-flex items-center gap-1 text-eskort-yellow text-sm font-semibold mb-4 hover:opacity-80"
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Order Status */}
          <div className="bg-eskort-dark-card border border-gray-700 rounded-xl p-6">
            <h3 className="text-eskort-yellow font-bold text-sm uppercase tracking-wide mb-4">
              ORDER STATUS
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Order Status</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(order.order_status).className}`}>
                  {getStatusBadge(order.order_status).label}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Payment Status</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPaymentStatusBadge(order.payment_status).className}`}>
                  {getPaymentStatusBadge(order.payment_status).label}
                </span>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-eskort-dark-card border border-gray-700 rounded-xl p-6">
            <h3 className="text-eskort-yellow font-bold text-sm uppercase tracking-wide mb-4">
              ORDER SUMMARY
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Subtotal</span>
                <span className="text-white font-medium">R{order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Delivery Fee</span>
                <span className="text-white font-medium">R{order.delivery_fee.toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-700 pt-3 flex justify-between">
                <span className="font-bold text-white text-base">Total</span>
                <span className="font-display text-2xl text-eskort-red">R{order.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Delivery Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-eskort-dark-card border border-gray-700 rounded-xl p-6">
            <h3 className="text-eskort-yellow font-bold text-sm uppercase tracking-wide mb-4">
              DELIVERY ADDRESS
            </h3>
            <p className="text-white whitespace-pre-line">{order.delivery_address}</p>
          </div>
          <div className="bg-eskort-dark-card border border-gray-700 rounded-xl p-6">
            <h3 className="text-eskort-yellow font-bold text-sm uppercase tracking-wide mb-4">
              CONTACT
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Name</span>
                <span className="text-white">{order.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Email</span>
                <span className="text-white">{order.customer_email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Phone</span>
                <span className="text-white">{order.customer_phone}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-eskort-dark-card border border-gray-700 rounded-xl p-6">
          <h3 className="text-eskort-yellow font-bold text-sm uppercase tracking-wide mb-4">
            ORDER ITEMS
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400">
                  <th className="text-left py-2">Product</th>
                  <th className="text-right py-2">Qty</th>
                  <th className="text-right py-2">Unit Price</th>
                  <th className="text-right py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item: OrderItem) => (
                  <tr key={item.id} className="border-b border-gray-800">
                    <td className="py-3 text-white">{item.product_name}</td>
                    <td className="py-3 text-right text-gray-400">{item.quantity}</td>
                    <td className="py-3 text-right text-gray-400">R{item.unit_price.toFixed(2)}</td>
                    <td className="py-3 text-right text-white font-medium">R{item.line_total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {order.notes && (
          <div className="mt-8 bg-eskort-dark-card border border-gray-700 rounded-xl p-6">
            <h3 className="text-eskort-yellow font-bold text-sm uppercase tracking-wide mb-2">
              NOTES
            </h3>
            <p className="text-gray-400 text-sm">{order.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}