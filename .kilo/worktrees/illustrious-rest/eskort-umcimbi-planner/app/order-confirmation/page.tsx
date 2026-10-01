"use client";

import Link from "next/link";
import { CheckCircle2, Package, Truck, Home } from "lucide-react";

const orderSteps = [
  { id: "confirmed", label: "Order Confirmed", sub: "Just now", icon: CheckCircle2, done: true },
  { id: "packing", label: "Being Packed", sub: "Est. 20 min", icon: Package, done: false, active: true },
  { id: "delivery", label: "Out for Delivery", sub: "Est. 2 hours", icon: Truck, done: false },
  { id: "delivered", label: "Delivered", sub: "Est. today", icon: Home, done: false },
];

export default function OrderConfirmationPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(to bottom, #CC0000 0%, #CC0000 45%, #F5EDD6 45%, #F5EDD6 100%)" }}>
      {/* Top red section */}
      <div className="flex flex-col items-center justify-center px-6 pt-16 pb-8 text-white text-center">
        {/* Animated package */}
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
                    ESK-3M0M2L
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">
                  Total Paid
                </p>
                <span className="text-white font-bold text-xl">R555</span>
              </div>
            </div>

            {/* Progress track */}
            <div className="relative">
              {/* Connector line */}
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
            <button className="w-full btn-primary py-4 text-base">
              Track My Order
            </button>
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
