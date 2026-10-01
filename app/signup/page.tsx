"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getSafeRedirect, ORDER_AUTH_MESSAGE } from "@/lib/auth-flow";

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = getSafeRedirect(searchParams.get("redirect"));
  const isOrderAuth = searchParams.get("reason") === "order";
  const { signUp, loading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setIsLoading(false);
      return;
    }

    const { error, data } = await signUp(email, password, name);

    if (error) {
      setError(error);
    } else {
      if (data?.session) {
        router.push(redirect);
      } else {
        const params = new URLSearchParams({ redirect });
        if (isOrderAuth) params.set("reason", "order");
        params.set("verified", "true");
        router.push(`/login?${params.toString()}`);
      }
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-eskort-dark-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-eskort-dark-card border border-gray-700 rounded-xl p-8">
          <div className="mb-8">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-eskort-yellow text-sm font-semibold mb-6 hover:opacity-80"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
              Back
            </Link>

            <h1 className="font-display text-4xl md:text-5xl text-white tracking-wide leading-none mb-2">
              CREATE ACCOUNT
            </h1>
            <p className="text-gray-500 text-xs mt-1">Join Eskort Umcimbi Planner</p>
          </div>

          {isOrderAuth && (
            <p role="alert" className="mb-5 rounded-md border border-eskort-yellow/40 bg-eskort-yellow/10 p-3 text-sm text-eskort-yellow">
              {ORDER_AUTH_MESSAGE}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-eskort-dark-card-2 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-eskort-yellow"
                placeholder="Full Name"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-eskort-dark-card-2 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-eskort-yellow"
                placeholder="email@example.com"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-eskort-dark-card-2 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-eskort-yellow pr-10"
                  placeholder="Password (min 6 characters)"
                  required
                  disabled={isLoading}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email || !password || !name || password.length < 6}
              className="w-full btn-primary py-3 text-base font-bold tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="text-center text-gray-500 text-xs mt-6">
            Already have an account?{" "}
            <Link href={`/login?redirect=${encodeURIComponent(redirect)}${isOrderAuth ? "&reason=order" : ""}`} className="text-eskort-yellow font-semibold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}