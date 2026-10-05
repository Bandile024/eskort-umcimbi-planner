"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronLeft } from "lucide-react";
import StepProgressBar from "@/components/StepProgressBar";
import QuantityControl from "@/components/QuantityControl";

const occasions = [
  { id: "family-braai", label: "Family Braai", emoji: "🥩", bg: "#3a1a0a" },
  { id: "friends-get-together", label: "Friends Get-Together", emoji: "🍻", bg: "#1a2a1a" },
  { id: "game-day", label: "Game Day", emoji: "🏆", bg: "#1a1a3a" },
  { id: "birthday", label: "Birthday", emoji: "🎂", bg: "#2a1a2a" },
  { id: "wedding", label: "Wedding", emoji: "💍", bg: "#2a2a1a" },
  { id: "corporate", label: "Corporate", emoji: "👔", bg: "#1a2a2a" },
];

const braaiStyles = [
  { id: "classic", label: "Classic Braai", desc: "Traditional wood fire" },
  { id: "shisa-nyama", label: "Shisa Nyama", desc: "Street-style grilling" },
  { id: "potjie", label: "Potjie Kos", desc: "Slow-cooked goodness" },
  { id: "gas-braai", label: "Gas Braai", desc: "Quick & easy" },
];

const guestPresets = [4, 8, 12, 20, 30];
const kidsPresets = [0, 2, 4, 6];
const uninvitedPresets = [0, 2, 4, 6];

export default function EventDetailsPage() {
  const router = useRouter();
  const [selectedOccasion, setSelectedOccasion] = useState("");
  const [guests, setGuests] = useState(0);
  const [kids, setKids] = useState(0);
  const [uninvited, setUninvited] = useState(0);
  const [budget, setBudget] = useState<number | "">("");
  const [error, setError] = useState("");

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "") {
      setBudget("");
    } else {
      setBudget(Math.max(0, Number(val)));
    }
  };
  const [selectedStyle, setSelectedStyle] = useState("");

  const isFormComplete =
    Boolean(selectedOccasion) &&
    Boolean(selectedStyle) &&
    guests > 0 &&
    Number(budget) > 0;

  const handleContinue = () => {
    if (!isFormComplete) {
      setError("Please complete all event details before calculating your braai.");
      return;
    }

    const eventDetails = {
      selectedOccasion,
      guests,
      kids,
      uninvited,
      budget: Number(budget || 0),
      selectedStyle,
    };

    setError("");
    localStorage.setItem("eskort-braai-event", JSON.stringify(eventDetails));
    router.push("/calculating");
  };

  return (
    <div className="min-h-screen bg-eskort-cream-light text-eskort-black">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-eskort-red text-sm font-semibold mb-4 hover:opacity-80 transition-opacity"
        >
          <ChevronLeft size={16} />
          Back
        </Link>

        {/* Step progress */}
        <StepProgressBar currentStep={1} totalSteps={3} />

        {/* Heading */}
        <div className="mb-8">
          <p className="text-gray-500 text-sm font-semibold uppercase tracking-widest">
            Tell us about
          </p>
          <h1 className="font-display text-6xl md:text-7xl text-eskort-black leading-none tracking-wide mt-1">
            YOUR EVENT
          </h1>
        </div>

        {/* ── WHAT'S THE OCCASION ── */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-eskort-black mb-4 uppercase tracking-wide">
            What&apos;s the occasion?
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {occasions.map((occ) => (
              <button
                key={occ.id}
                onClick={() => setSelectedOccasion(occ.id)}
                aria-pressed={selectedOccasion === occ.id}
                className={`occasion-card relative h-24 rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                  selectedOccasion === occ.id
                    ? "border-eskort-yellow scale-[1.02] shadow-lg ring-2 ring-eskort-yellow/50"
                    : "border-transparent"
                }`}
                style={{ background: occ.bg }}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2">
                  <span className="text-3xl">{occ.emoji}</span>
                  <span className="text-white text-xs font-bold uppercase tracking-wider text-center leading-tight">
                    {occ.label}
                  </span>
                </div>
                {selectedOccasion === occ.id && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-eskort-yellow rounded-full flex items-center justify-center">
                    <span className="text-black text-[10px] font-bold">✓</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* ── GUESTS ── */}
        <section className="bg-eskort-dark-card rounded-xl p-5 mb-4 border border-gray-800">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className="text-white font-bold text-base uppercase tracking-wide">
                Guests
              </h3>
              <p className="text-gray-400 text-xs mt-0.5">How many mouths to feed?</p>
            </div>
            <QuantityControl value={guests} onChange={setGuests} min={1} max={500} inputClassName="text-white placeholder:text-white" />
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {guestPresets.map((preset) => (
              <button
                key={preset}
                onClick={() => setGuests(preset)}
                aria-pressed={guests === preset}
                className={`qty-preset ${guests === preset ? "qty-preset-active" : ""}`}
              >
                {preset}
              </button>
            ))}
          </div>
        </section>

        {/* ── KIDS ── */}
        <section className="bg-eskort-dark-card rounded-xl p-5 mb-4 border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold text-base uppercase tracking-wide">
                Kids
              </h3>
              <p className="text-gray-400 text-xs mt-0.5">Are there kids involved?</p>
            </div>
            <QuantityControl value={kids} onChange={setKids} min={0} max={100} inputClassName="text-white placeholder:text-white" />
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {kidsPresets.map((preset) => (
              <button
                key={preset}
                onClick={() => setKids(preset)}
                aria-pressed={kids === preset}
                className={`qty-preset ${kids === preset ? "qty-preset-active" : ""}`}
              >
                {preset}
              </button>
            ))}
          </div>
        </section>

        {/* ── THE UNINVITED COUSIN ── */}
        <section className="bg-eskort-dark-card border border-gray-800 rounded-xl p-5 mb-4">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className="text-white font-bold text-base uppercase tracking-wide">
                The Uninvited Cousin
              </h3>
              <p className="text-gray-400 text-xs mt-0.5">
                Buffer for unannounced guests — you know who 😅
              </p>
            </div>
            <QuantityControl value={uninvited} onChange={setUninvited} min={0} max={20} inputClassName="text-white placeholder:text-white" />
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {uninvitedPresets.map((preset) => (
              <button
                key={preset}
                onClick={() => setUninvited(preset)}
                aria-pressed={uninvited === preset}
                className={`qty-preset ${uninvited === preset ? "qty-preset-active" : ""}`}
              >
                {preset}
              </button>
            ))}
          </div>
        </section>

        {/* ── BUDGET ── */}
        <section className="bg-eskort-dark-card rounded-xl p-5 mb-4 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-bold text-base uppercase tracking-wide">
                Budget
              </h3>
              <p className="text-gray-400 text-xs mt-0.5">What&apos;s your total braai budget?</p>
            </div>
            <span className="text-eskort-yellow font-bold text-xl">
              R{budget.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center bg-eskort-dark-bg border border-gray-600 rounded-lg overflow-hidden focus-within:border-eskort-yellow transition-colors">
            <span className="text-eskort-yellow font-bold px-3 text-lg select-none">R</span>
            <input
              type="number"
              min={0}
              step={100}
              value={budget === "" ? "" : budget}
              onChange={handleBudgetChange}
              className="flex-1 bg-transparent text-white font-bold text-lg py-3 pr-4 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="Enter your budget"
            />
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {[500, 1000, 2500, 5000, 10000].map((amt) => (
              <button
                key={amt}
                onClick={() => setBudget(amt)}
                aria-pressed={budget === amt}
                className={`qty-preset ${budget === amt ? "qty-preset-active" : ""}`}
              >
                R{amt.toLocaleString()}</button>
            ))}
          </div>
        </section>

        {/* ── BRAAI STYLE ── */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-eskort-black mb-4 uppercase tracking-wide">
            Braai Style
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {braaiStyles.map((style) => (
              <button
                key={style.id}
                onClick={() => setSelectedStyle(style.id)}
                aria-pressed={selectedStyle === style.id}
                className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                  selectedStyle === style.id
                    ? "border-eskort-yellow bg-eskort-yellow/15 shadow-md"
                    : "border-gray-700 bg-eskort-dark-card hover:border-gray-500"
                }`}
              >
                <p
                  className={`font-bold text-sm ${
                    selectedStyle === style.id ? "text-eskort-yellow" : "text-white"
                  }`}
                >
                  {style.label}
                </p>
                <p className="text-gray-400 text-xs mt-1">{style.desc}</p>
              </button>
            ))}
          </div>
        </section>

        {/* ── SUMMARY BAR ── */}
        <div className="bg-eskort-dark-card rounded-xl p-4 mb-6 border border-gray-700 flex flex-wrap gap-4 text-sm text-gray-300">
          <span>
            <span className="text-white font-semibold">{guests + uninvited}</span> guests
          </span>
          <span>·</span>
          <span>
            Budget <span className="text-eskort-yellow font-semibold">R{(budget || 0).toLocaleString()}</span>
          </span>
          <span>·</span>
          <span>
            <span className="text-white font-semibold">
              ~R{Math.round((budget || 0) / (guests + uninvited || 1))}
            </span>
            /person
          </span>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ── CTA ── */}
        <button
          onClick={handleContinue}
          disabled={!isFormComplete}
          className={`w-full py-4 text-base rounded-xl transition-opacity ${
            isFormComplete ? "btn-primary" : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          Calculate My Braai →
        </button>
      </div>
    </div>
  );
}
