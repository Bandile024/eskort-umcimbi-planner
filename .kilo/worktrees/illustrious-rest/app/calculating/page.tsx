"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const steps = [
  "Counting 8 mouths to feed...",
  "Matching your budget...",
  "Calculating fair portions per plate...",
  "Selecting best-fit hampers for you...",
];

export default function CalculatingPage() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  useEffect(() => {
    // Animate progress bar
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, 60);

    // Complete checklist steps sequentially
    steps.forEach((_, i) => {
      setTimeout(() => {
        setCompletedSteps((prev) => [...prev, i]);
      }, (i + 1) * 900);
    });

    // Navigate after animation completes
    const timeout = setTimeout(() => {
      router.push("/recommended-packages");
    }, 4500);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [router]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at center, #1a1a1a 0%, #0a0a0a 100%)",
      }}
    >
      {/* Decorative background icons */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none select-none text-7xl flex flex-wrap gap-16 p-10 overflow-hidden">
        {["🥩", "🌭", "🍖", "🔥", "🥓", "🫕", "🧂", "🍗", "🥩", "🌭", "🍖", "🔥"].map(
          (e, i) => (
            <span
              key={i}
              style={{ transform: `rotate(${(i * 37) % 360}deg)` }}
            >
              {e}
            </span>
          )
        )}
      </div>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center text-center">
        {/* Logo */}
        <div className="font-display text-4xl text-eskort-yellow tracking-widest mb-8">
          ESKORT
        </div>

        {/* Fire emoji */}
        <div className="text-7xl mb-6 animate-pulse-slow">🔥</div>

        {/* Heading */}
        <h1 className="font-display text-5xl md:text-6xl text-white tracking-wide leading-tight mb-3">
          DOING THE<br />BRAAI MATH.
        </h1>
        <p className="text-gray-400 text-sm mb-10">
          Calculating the perfect portions for your crew
        </p>

        {/* Progress bar */}
        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mb-8">
          <div
            className="h-full rounded-full transition-all duration-150"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(to right, #CC0000, #F5A800)",
            }}
          />
        </div>

        {/* Checklist */}
        <ul className="w-full space-y-3 text-left">
          {steps.map((step, i) => {
            const done = completedSteps.includes(i);
            const active = !done && completedSteps.length === i;
            return (
              <li key={i} className="flex items-center gap-3">
                <span
                  className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    done
                      ? "bg-eskort-yellow text-black"
                      : active
                      ? "border-2 border-eskort-yellow animate-pulse"
                      : "border-2 border-gray-700"
                  }`}
                >
                  {done ? "✓" : ""}
                </span>
                <span
                  className={`text-sm transition-colors duration-300 ${
                    done
                      ? "text-white font-medium"
                      : active
                      ? "text-gray-300"
                      : "text-gray-600"
                  }`}
                >
                  {step}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
