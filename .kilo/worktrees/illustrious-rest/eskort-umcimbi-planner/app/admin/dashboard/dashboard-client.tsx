"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Package, ChevronLeft, Search, Filter, RefreshCw } from "lucide-react"
import type { DashboardStats, Order, OrderStatus, PaymentStatus, PaginatedOrders } from "@/lib/types"
import { supabase } from "@/lib/supabase"

interface AdminDashboardClientProps {
  adminName: string
}

const orderStatusOptions: { value: string; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
]

const paymentStatusOptions: { value: string; label: string }[] = [
  { value: "all", label: "All Payment Statuses" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
]

export default function AdminDashboardClient({ adminName }: AdminDashboardClientProps) {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    total_orders: 0,
    pending_orders: 0,
    processing_orders: 0,
    delivered_orders: 0,
    revenue_total: 0,
  })
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [paymentFilter, setPaymentFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalOrders, setTotalOrders] = useState(0)

  const limit = 20

  const fetchStats = async () => {
    setStatsLoading(true)
    try {
      const response = await fetch("/api/admin/dashboard")
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error)
    } finally {
      setStatsLoading(false)
    }
  }

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        status: statusFilter,
        payment_status: paymentFilter,
        page: String(currentPage),
        limit: String(limit),
        sort: "newest",
      })

      const response = await fetch(`/api/admin/orders?${params.toString()}`)
      if (response.ok) {
        const data: PaginatedOrders = await response.json()
        setOrders(data.orders)
        setTotalPages(data.totalPages)
        setTotalOrders(data.total)
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    fetchOrders()
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [searchTerm, statusFilter, paymentFilter, currentPage])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
  }

  const handleFilterChange = (type: "status" | "payment", value: string) => {
    if (type === "status") {
      setStatusFilter(value)
    } else {
      setPaymentFilter(value)
    }
    setCurrentPage(1)
  }

  const handleRefresh = () => {
    fetchStats()
    fetchOrders()
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
      month: "short",
      day: "numeric",
    })
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

  const getPaymentColor = (status: string) => {
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
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-eskort-yellow text-sm font-semibold mb-8 hover:opacity-80"
        >
          <ChevronLeft size={16} />
          Back to Store
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-5xl md:text-6xl text-white tracking-wide leading-none">
              ADMIN DASHBOARD
            </h1>
            <p className="text-gray-500 text-sm mt-2">Welcome, {adminName}</p>
          </div>
          <button
            onClick={handleRefresh}
            className="p-2 bg-eskort-dark-card border border-gray-700 rounded-lg text-gray-300 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        {statsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-24 bg-gray-800/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-eskort-dark-card border border-gray-700 rounded-xl p-5 text-center">
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Total Orders</p>
              <p className="font-display text-3xl text-eskort-red">{stats.total_orders}</p>
            </div>
            <div className="bg-eskort-dark-card border border-gray-700 rounded-xl p-5 text-center">
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Pending</p>
              <p className="font-display text-3xl text-yellow-400">{stats.pending_orders}</p>
            </div>
            <div className="bg-eskort-dark-card border border-gray-700 rounded-xl p-5 text-center">
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Processing</p>
              <p className="font-display text-3xl text-blue-400">{stats.processing_orders}</p>
            </div>
            <div className="bg-eskort-dark-card border border-gray-700 rounded-xl p-5 text-center">
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Delivered</p>
              <p className="font-display text-3xl text-green-400">{stats.delivered_orders}</p>
            </div>
            <div className="bg-eskort-dark-card border border-gray-700 rounded-xl p-5 text-center">
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Revenue</p>
              <p className="font-display text-3xl text-eskort-yellow">R{stats.revenue_total.toLocaleString()}</p>
            </div>
          </div>
        )}

        <div className="bg-eskort-dark-card border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl text-white">Orders</h2>
            <Link
              href="/admin/orders"
              className="text-eskort-yellow text-sm font-medium hover:underline"
            >
              View All
            </Link>
          </div>

          <form onSubmit={handleSearch} className="mb-4 flex gap-2">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search by order number, customer name, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-eskort-dark-bg border border-gray-700 rounded-lg pl-10 pr-3 py-2 text-white text-sm focus:outline-none focus:border-eskort-yellow transition-colors"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-eskort-red text-white rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Search
            </button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <select
              value={statusFilter}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="bg-eskort-dark-bg border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-eskort-yellow transition-colors"
            >
              {orderStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={paymentFilter}
              onChange={(e) => handleFilterChange("payment", e.target.value)}
              className="bg-eskort-dark-bg border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-eskort-yellow transition-colors"
            >
              {paymentStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-gray-800/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 mx-auto text-gray-600 mb-4" />
              <p className="text-gray-500 text-sm">No orders found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 text-gray-500 text-xs font-medium uppercase tracking-wider">Order</th>
                      <th className="text-left py-3 text-gray-500 text-xs font-medium uppercase tracking-wider">Customer</th>
                      <th className="text-left py-3 text-gray-500 text-xs font-medium uppercase tracking-wider">Phone</th>
                      <th className="text-right py-3 text-gray-500 text-xs font-medium uppercase tracking-wider">Total</th>
                      <th className="text-center py-3 text-gray-500 text-xs font-medium uppercase tracking-wider">Payment</th>
                      <th className="text-center py-3 text-gray-500 text-xs font-medium uppercase tracking-wider">Status</th>
                      <th className="text-right py-3 text-gray-500 text-xs font-medium uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors"
                      >
                        <td className="py-3">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="text-eskort-yellow font-medium hover:underline"
                          >
                            {order.order_number}
                          </Link>
                        </td>
                        <td className="py-3 text-sm text-white">{order.customer_name}</td>
                        <td className="py-3 text-sm text-gray-400">{order.customer_phone}</td>
                        <td className="py-3 text-right text-sm font-medium text-white">{formatCurrency(order.total_amount)}</td>
                        <td className="py-3 text-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${getPaymentColor(order.payment_status)}`}>
                            {order.payment_status}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(order.order_status)}`}>
                            {order.order_status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 text-right text-sm text-gray-500">{formatDate(order.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-700">
                  <p className="text-sm text-gray-500">
                    Showing {((currentPage - 1) * limit) + 1} - {Math.min(currentPage * limit, totalOrders)} of {totalOrders} orders
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 bg-eskort-dark-bg border border-gray-700 rounded text-gray-300 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 bg-eskort-dark-bg border border-gray-700 rounded text-gray-300 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}