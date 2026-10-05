"use client";

import Link from "next/link";
import { Award } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-eskort-dark-bg">
      {/* ── HERO SECTION ── */}
      <section
        className="relative min-h-[88vh] flex items-center"
        style={{
          background:
            "linear-gradient(to right, rgba(0,0,0,0.55) 30%, rgba(0,0,0,0.20) 60%, rgba(0,0,0,0.05) 100%), url('/images/hero-bg.png') center/cover no-repeat",
          backgroundColor: "#1a1a0e",
        }}
      >

        {/* Hero content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pt-24 pb-16 w-full">
          <div className="max-w-xl">
            <h1 className="font-display text-7xl md:text-8xl lg:text-9xl text-white leading-none tracking-wide mb-2">
              UMCIMBI
              <br />
              <span className="text-eskort-yellow">PLANNER</span>
            </h1>

            <p className="text-gray-300 text-sm md:text-base mt-4 mb-8 max-w-md leading-relaxed">
              Plan the perfect Umcimbi in minutes. Tell us how many people are
              coming, your budget and your braai style. We&apos;ll calculate the
              perfect Eskort shopping list for you.
            </p>

            {/* Award badge */}
            <div className="inline-flex items-center gap-2 bg-eskort-yellow/10 border border-eskort-yellow/30 rounded-full px-3 py-1.5 mb-6">
              <Award size={16} className="text-eskort-yellow" />
              <span className="text-eskort-yellow text-xs font-semibold">
                SA&apos;s #1 Braai Planner
              </span>
            </div>

            <div className="flex flex-wrap gap-3 mt-2">
              <Link href="/event-details" className="btn-primary text-center">
                Start Planning
              </Link>
            </div>
          </div>
        </div>

        {/* "Flavour Loaded" badge — bottom right */}
        <div className="absolute bottom-10 right-8 hidden md:block">
          <div
            className="font-display text-eskort-yellow text-2xl tracking-widest"
            style={{ transform: "rotate(-15deg)" }}
          >
            FLAVOUR LOADED
          </div>
        </div>

        {/* Gradient bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-eskort-dark-bg to-transparent" />
      </section>

      {/* ── PLAN CTA BANNER ── */}
      <section className="bg-eskort-red py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display text-4xl md:text-5xl text-white mb-3 tracking-wide">
            READY TO PLAN YOUR BRAAI?
          </h2>
          <p className="text-red-200 mb-6 text-sm">
            Tell us your event details and we&apos;ll build the perfect Eskort shopping list.
          </p>
          <Link href="/event-details" className="btn-primary inline-block">
            Let&apos;s Plan Your Braai
          </Link>
        </div>
      </section>
    </div>
  );
}
