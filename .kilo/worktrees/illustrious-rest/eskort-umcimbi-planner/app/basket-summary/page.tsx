"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronDown, ChevronUp, Plus, MessageCircle } from "lucide-react";

const basketItems = [
  {
    id: "boerewors",
    name: "Eskort Braai Boerewors",
    detail: "500g · serves 4 · ×2",
    emoji: "🌭",
    bg: "#2a1a0a",
  },
  {
    id: "lamb-chops",
    name: "Eskort Lamb Shoulder Chops",
    detail: "±800g · 4 pieces · ×1",
    emoji: "🥩",
    bg: "#1a2a1a",
  },
  {
    id: "chicken",
    name: "Eskort Chicken Drumsticks",
    detail: "±900g · 6 pieces · ×1",
    emoji: "🍗",
    bg: "#1a1a2a",
  },
  {
    id: "ribs",
    name: "Eskort Pork Spare Ribs",
    detail: "±800g · full rack · ×1",
    emoji: "🍖",
    bg: "#2a1a1a",
  },
  {
    id: "braai-bread",
    name: "Garlic Braai Bread",
    detail: "4 thick slices · ×1",
    emoji: "🍞",
    bg: "#2a2a1a",
  },
];

export default function BasketSummaryPage() {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggle = (id: string) => setExpanded(expanded === id ? null : id);

  return (
    <div className="min-h-screen bg-eskort-cream-light pb-32">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Back */}
        <Link
          href="/build-my-braai"
          className="inline-flex items-center gap-1 text-eskort-red text-sm font-semibold mb-4 hover:opacity-80"
        >
          <ChevronLeft size={16} />
          Back
        </Link>

        {/* Header */}
        <div className="mb-6">
          <h1 className="font-display text-5xl md:text-6xl leading-none tracking-wide">
            <span className="text-blue-700">THE CROWD</span>
            <br />
            <span className="text-eskort-yellow">PLEASER BASKET</span>
          </h1>
          <p className="text-gray-500 text-sm mt-2">Family Braai · 8 people</p>
        </div>

        {/* Section heading */}
        <h2 className="text-base font-bold text-eskort-black uppercase tracking-wider mb-3">
          What the basket has
        </h2>

        {/* Item list */}
        <div className="border border-gray-200 rounded-2xl overflow-hidden mb-6 bg-white shadow-sm">
          {basketItems.map((item, i) => (
            <div key={item.id} className={`${i > 0 ? "border-t border-gray-100" : ""}`}>
              <button
                onClick={() => toggle(item.id)}
                className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors text-left"
              >
                {/* Thumbnail */}
                <div
                  className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl"
                  style={{ background: item.bg }}
                >
                  {item.emoji}
                </div>
                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-eskort-black font-semibold text-sm truncate">
                    {item.name}
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5">{item.detail}</p>
                </div>
                {/* Expand icon */}
                {expanded === item.id ? (
                  <ChevronUp size={16} className="text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
                )}
              </button>

              {/* Expanded detail */}
              {expanded === item.id && (
                <div className="px-4 pb-4 bg-gray-50 text-sm text-gray-600">
                  <p className="mb-1">
                    Perfect for grilling over medium-high heat. Cook to 75°C internal
                    temperature. Pairs well with pap and chakalaka.
                  </p>
                  <p className="text-eskort-red font-medium text-xs">View recipe →</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add an item */}
        <button className="w-full border-2 border-dashed border-eskort-yellow rounded-xl py-3 flex items-center justify-center gap-2 text-eskort-yellow font-semibold text-sm hover:bg-eskort-yellow/5 transition-colors mb-6">
          <Plus size={16} />
          Add an item
        </button>

        {/* Fair share */}
        <button className="w-full border border-eskort-black/30 rounded-xl py-3 flex items-center justify-center gap-2 text-eskort-black font-semibold text-sm hover:bg-gray-100 transition-colors mb-4">
          ⚖️ View Fair Share Portion Preview
        </button>

        {/* Floating chat button */}
        <div className="fixed bottom-24 right-6 z-40">
          <button className="w-12 h-12 bg-eskort-green rounded-full flex items-center justify-center shadow-xl text-white hover:bg-green-700 transition-colors">
            <MessageCircle size={20} />
          </button>
        </div>
      </div>

      {/* ── STICKY BOTTOM CTA ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4 z-30">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/checkout"
            className="w-full btn-primary py-4 text-base flex items-center justify-center"
          >
            Proceed to Checkout →
          </Link>
        </div>
      </div>
    </div>
  );
}
