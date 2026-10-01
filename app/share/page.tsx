"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Copy, Share2, CheckCheck } from "lucide-react";

const menuItems = [
  { name: "BBQ Sauce 500ml", qty: "+1", serves: 5 },
  { name: "Braai Spice 260g", qty: "+1", serves: 8 },
  { name: "Kids Mini Sausages 300g", qty: "+1", serves: 4 },
  { name: "Complete Braai Hamper", qty: "×4", serves: 10 },
];

const whatsappMessage = `Your friend's Family Lunch is sorted! 🎉

We're feeding 10 people with BBQ sauce 500ml, braai spice 260g, kids' mini sausages 300g, and complete braai hamper.

Total food budget: R475
Suggested contribution: R48 per person

See the full menu and quantities here: [Umcimbi link]

No surprises. No one leaves hungry.`;

export default function SharePage() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(whatsappMessage).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleWhatsApp = () => {
    const encoded = encodeURIComponent(whatsappMessage);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-eskort-dark-bg">
      {/* Hero banner */}
      <div
        className="relative py-10 px-6"
        style={{
          background:
            "linear-gradient(135deg, #1a3a1a 0%, #0a2a0a 50%, #1a1a0a 100%)",
        }}
      >
        <div className="max-w-4xl mx-auto">
          <Link
            href="/order-confirmation"
            className="inline-flex items-center gap-1 text-gray-300 text-sm font-semibold mb-4 hover:text-white"
          >
            <ChevronLeft size={16} />
            Back
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-display text-5xl md:text-6xl text-white tracking-wide leading-tight">
                SHARE TO
                <br />
                THE CREW
              </h1>
              <p className="text-gray-300 text-sm mt-2">
                Share your Umcimbi plan
              </p>
            </div>
            {/* Banner badge */}
            <div className="hidden md:block text-right">
              <div className="bg-eskort-green rounded-xl p-4 text-center text-white max-w-[160px]">
                <p className="font-bold text-sm leading-tight">
                  GOOD TIMES
                  <br />
                  GREAT FOOD
                  <br />
                  BETTER
                  <br />
                  TOGETHER
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ── LEFT: EVENT SUMMARY ── */}
          <div className="space-y-4">
            {/* Event card */}
            <div className="bg-eskort-dark-card rounded-2xl p-5 border border-gray-800">
              <p className="text-eskort-red text-xs font-bold uppercase tracking-widest mb-2">
                Event
              </p>
              <h2 className="text-white font-bold text-xl mb-4">
                FAMILY LUNCH
              </h2>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: "Guests", value: "8", unit: "" },
                  { label: "Total", value: "R2500", unit: "" },
                  { label: "Each", value: "R313", unit: "" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-eskort-dark-card-2 rounded-xl p-3">
                    <p className="text-white font-bold text-lg">{stat.value}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* On the braai */}
            <div className="bg-eskort-dark-card rounded-2xl p-5 border border-gray-800">
              <p className="text-eskort-red text-xs font-bold uppercase tracking-widest mb-3">
                On The Braai
              </p>
              <ul className="space-y-2">
                {menuItems.map((item, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="text-white">
                      {item.name}{" "}
                      <span className="text-gray-400">{item.qty}</span>
                    </span>
                    <span className="text-gray-400 text-xs">
                      serves {item.serves}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ── RIGHT: SHARE OPTIONS ── */}
          <div className="space-y-4">
            {/* WhatsApp message preview */}
            <div className="bg-eskort-dark-card rounded-2xl p-5 border border-gray-800">
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-3">
                Auto-Generated WhatsApp Message
              </p>
              <div className="bg-green-900/30 rounded-xl p-4 border border-green-700/30">
                <pre className="text-gray-300 text-xs whitespace-pre-wrap leading-relaxed font-sans">
                  {whatsappMessage}
                </pre>
              </div>
            </div>

            {/* Share buttons */}
            <button
              onClick={handleWhatsApp}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl transition-colors text-sm"
            >
              <Share2 size={18} />
              Share on WhatsApp
            </button>

            <button
              onClick={handleCopy}
              className={`w-full flex items-center justify-center gap-2 font-bold py-4 rounded-xl transition-colors text-sm border-2 ${
                copied
                  ? "border-green-500 text-green-400 bg-green-500/10"
                  : "border-gray-600 text-white hover:border-gray-400"
              }`}
            >
              {copied ? (
                <>
                  <CheckCheck size={18} className="text-green-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={18} />
                  Copy Link
                </>
              )}
            </button>

            {/* Pass the Tongs */}
            <div className="bg-eskort-red/10 border border-eskort-red/30 rounded-2xl p-4">
              <p className="text-eskort-red font-bold text-sm mb-1">
                🥩 Pass the Tongs
              </p>
              <p className="text-gray-400 text-xs leading-relaxed">
                Invite a mate to take the lead. They get R10 off their first
                Eskort braai — and you earn rewards whenever they shop.
              </p>
            </div>

            {/* Bottom nav */}
            <div className="flex gap-3 pt-2">
              <Link href="/" className="flex-1 btn-dark py-3 text-center text-sm">
                Home
              </Link>
              <Link
                href="/event-details"
                className="flex-1 btn-primary py-3 text-center text-sm"
              >
                New Plan
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* "Made for Umcimbi Vibes" stamp */}
      <div className="fixed bottom-6 right-6 z-40 hidden md:block pointer-events-none">
        <div
          className="w-24 h-24 rounded-full border-4 border-eskort-red flex items-center justify-center text-center"
          style={{ transform: "rotate(-15deg)", background: "rgba(204,0,0,0.15)" }}
        >
          <p className="text-eskort-red font-bold text-[10px] leading-tight uppercase px-1">
            MADE FOR<br />UMCIMBI<br />VIBES
          </p>
        </div>
      </div>
    </div>
  );
}
