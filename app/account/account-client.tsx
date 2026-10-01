"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { ChevronLeft, Package, User, LogOut, Settings } from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import type { OrderWithItems } from "@/lib/types"

interface AccountClientProps {
  user: SupabaseUser
  profile: {
    full_name: string
    email: string
    role: string
  } | null
}

export default function AccountClient({ user, profile }: AccountClientProps) {
  const router = useRouter()
  const { signOut } = useAuth()
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

  const handleSignOut = async () => {
    await signOut()
    router.push("/")
    router.refresh()
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
          href="/"
          className="inline-flex items-center gap-1 text-eskort-yellow text-sm font-semibold mb-8 hover:opacity-80"
        >
          <ChevronLeft size={16} />
          Back
        </Link>

        <div className="mb-8">
          <h1 className="font-display text-5xl md:text-6xl text-white tracking-wide leading-none">
            MY ACCOUNT
          </h1>
          <p className="text-gray-500 text-sm mt-2">Manage your orders and profile</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-1">
            <div className="bg-eskort-dark-card border border-gray-700 rounded-xl p-6 sticky top-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-eskort-red rounded-full flex items-center justify-center text-2xl font-bold">
                  {profile?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
                </div>
                <div>
                  <h2 className="font-bold text-white text-lg">{profile?.full_name || "Customer"}</h2>
                  <p className="text-gray-500 text-sm">{user.email}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Link
                  href="/account/orders"
                  className="flex items-center gap-3 px-3 py-2.5 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <Package size={18} />
                  <span className="font-medium">My Orders</span>
                </Link>
                <Link
                  href="/account/profile"
                  className="flex items-center gap-3 px-3 py-2.5 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <User size={18} />
                  <span className="font-medium">Profile</span>
                </Link>
                <Link
                  href="/account/settings"
                  className="flex items-center gap-3 px-3 py-2.5 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <Settings size={18} />
                  <span className="font-medium">Settings</span>
                </Link>
              </div>

              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors mt-4"
              >
                <LogOut size={18} />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-eskort-dark-card border border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-2xl text-white">Recent Orders</h2>
                <Link
                  href="/account/orders"
                  className="text-eskort-yellow text-sm font-medium hover:underline"
                >
                  View All
                </Link>
              </div>

              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
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
                  {orders.slice(0, 5).map((order) => (
                    <Link
                      key={order.id}
                      href={`/account/orders/${order.id}`}
                      className="block p-4 bg-gray-900/30 border border-gray-700 rounded-xl hover:border-eskort-yellow/50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-4">
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
      </div>
    </div>
  )
}