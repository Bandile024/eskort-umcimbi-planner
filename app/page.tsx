"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Award } from "lucide-react";

const favourites = [
  { name: "Bacon", emoji: "🥓" },
  { name: "Biltong", emoji: "🥩" },
  { name: "Cold Meats", emoji: "🍖" },
  { name: "Hampers", emoji: "🎁" },
  { name: "Convenience", emoji: "🍱" },
  { name: "Polony & Spreads", emoji: "🥪" },
  { name: "Sauces & Spices", emoji: "🌶️" },
  { name: "Boerewors", emoji: "🌭" },
];

export default function HomePage() {
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [dotIndex, setDotIndex] = useState(0);

  const visibleCount = 6;
  const maxIndex = favourites.length - visibleCount;

  const prev = () => {
    const next = Math.max(carouselIndex - 1, 0);
    setCarouselIndex(next);
    setDotIndex(Math.floor(next / 2));
  };
  const next = () => {
    const n = Math.min(carouselIndex + 1, maxIndex);
    setCarouselIndex(n);
    setDotIndex(Math.floor(n / 2));
  };

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
              <Link href="#favourites" className="btn-secondary text-center">
                Shop Products
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

      {/* ── BROWSE FAVOURITES ── */}
      <section id="favourites" className="bg-eskort-dark-bg py-14 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-gray-400 text-sm font-medium tracking-widest uppercase mb-1">
              Browse Your
            </p>
            <h2 className="font-display text-5xl md:text-6xl text-white tracking-wide">
              FAVOURITES
            </h2>
          </div>

          {/* Carousel */}
          <div className="relative flex items-center">
            <button
              onClick={prev}
              disabled={carouselIndex === 0}
              className="flex-shrink-0 w-10 h-10 rounded-full bg-eskort-dark-card border border-gray-700 flex items-center justify-center text-white hover:bg-eskort-yellow hover:text-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed z-10"
              aria-label="previous"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="flex-1 overflow-hidden mx-2">
              <div
                className="flex gap-4 transition-transform duration-400"
                style={{ transform: `translateX(-${carouselIndex * (100 / visibleCount)}%)` }}
              >
                {favourites.map((item, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 flex flex-col items-center gap-3 cursor-pointer group"
                    style={{ width: `calc(${100 / visibleCount}% - 14px)`, minWidth: "100px" }}
                  >
                    {/* Circle image placeholder */}
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-eskort-dark-card border-4 border-eskort-dark-card-2 group-hover:border-eskort-yellow transition-all duration-200 flex items-center justify-center text-4xl overflow-hidden shadow-card">
                      <span>{item.emoji}</span>
                    </div>
                    <span className="text-white text-xs font-bold tracking-wider uppercase text-center">
                      {item.name} ›
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={next}
              disabled={carouselIndex >= maxIndex}
              className="flex-shrink-0 w-10 h-10 rounded-full bg-eskort-dark-card border border-gray-700 flex items-center justify-center text-white hover:bg-eskort-yellow hover:text-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed z-10"
              aria-label="next"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Carousel dots */}
          <div className="flex justify-center gap-2 mt-6">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`carousel-dot ${dotIndex === i ? "carousel-dot-active" : ""}`}
              />
            ))}
          </div>
        </div>
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
