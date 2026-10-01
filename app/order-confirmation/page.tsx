"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Package, Truck, Home } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_address: string;
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  payment_status: string;
  order_status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

const orderSteps = [
  { id: "confirmed", label: "Order Confirmed", sub: "Just now", icon: CheckCircle2, done: true },
  { id: "packing", label: "Being Packed", sub: "Est. 20 min", icon: Package, done: false, active: true },
  { id: "delivery", label: "Out for Delivery", sub: "Est. 2 hours", icon: Truck, done: false },
  { id: "delivered", label: "Delivered", sub: "Est. today", icon: Home, done: false },
];

export default function OrderConfirmationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) {
      router.push("/");
      return;
    }

    const fetchOrder = async () => {
      try {
        const { data, error } = await supabase
          .from("orders")
          .select(`
            *,
            order_items (
              id,
              product_name,
              quantity,
              unit_price,
              line_total
            )
          `)
          .eq("id", orderId)
          .single();

        if (error || !data) {
          router.push("/");
          return;
        }

        setOrder(data as Order);
      } catch {
        router.push("/");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-eskort-dark-bg flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "PPP");
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(to bottom, #CC0000 0%, #CC0000 45%, #F5EDD6 45%, #F5EDD6 100%)" }}>
      {/* Top red section */}
      <div className="flex flex-col items-center justify-center px-6 pt-16 pb-8 text-white text-center">
        <div className="text-7xl mb-4 animate-bounce">📦</div>

        <h1 className="font-display text-5xl md:text-6xl tracking-wide leading-tight mb-2">
          YOUR PACKAGE IS ON ITS WAY!
        </h1>
        <p className="text-red-200 text-sm">
          Order confirmed — fire up the braai 🔥
        </p>
      </div>

      {/* Order card */}
      <div className="flex-1 px-4 pb-10">
        <div className="max-w-lg mx-auto">
          {/* Order info card */}
          <div className="bg-eskort-dark-card rounded-2xl p-5 mb-4 shadow-card border border-gray-800">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">
                  Order Number
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🚗</span>
                  <span className="text-white font-bold text-xl tracking-widest">
                    {order.order_number}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">
                  Total Paid
                </p>
                <span className="text-white font-bold text-xl">R{order.total_amount.toFixed(2)}</span>
              </div>
            </div>

            {/* Progress track */}
            <div className="relative">
              <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-700 z-0" />
              <div
                className="absolute top-4 left-4 h-0.5 bg-eskort-yellow z-0"
                style={{ width: "25%" }}
              />

              <div className="relative z-10 flex items-start justify-between">
                {orderSteps.map((step) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.id} className="order-step flex-1">
                      <div
                        className={`order-step-dot mx-auto mb-1 ${
                          step.done
                            ? "bg-eskort-yellow text-black"
                            : step.active
                            ? "bg-eskort-dark-card-2 border-2 border-eskort-yellow text-eskort-yellow"
                            : "bg-gray-800 border-2 border-gray-600 text-gray-500"
                        }`}
                      >
                        <Icon size={14} />
                      </div>
                      <p
                        className={`text-[10px] font-semibold ${
                          step.done || step.active ? "text-white" : "text-gray-500"
                        }`}
                      >
                        {step.label}
                      </p>
                      <p className="text-[10px] text-gray-500">{step.sub}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Reward unlocked banner */}
          <div className="bg-eskort-dark-card rounded-2xl p-4 mb-6 border border-eskort-yellow/30 flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">🎁</span>
            <div>
              <p className="text-white font-bold text-sm">Your reward is unlocked!</p>
              <p className="text-gray-400 text-xs mt-0.5">
                Track your order for 30 days and R20 off your next Eskort braai.
              </p>
            </div>
          </div>

          {/* CTAs */}
          <div className="space-y-3">
            <Link
              href={`/account/orders/${order.id}`}
              className="w-full btn-primary py-4 text-base block text-center"
            >
              Track My Order
            </Link>
            <Link
              href="/"
              className="w-full block border-2 border-eskort-black/30 text-eskort-black font-bold py-3.5 rounded-lg text-center text-sm hover:bg-gray-100 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}