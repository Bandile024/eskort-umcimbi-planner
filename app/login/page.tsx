"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth, getUserRole } from "@/lib/auth-context";
import { getSafeRedirect, ORDER_AUTH_MESSAGE } from "@/lib/auth-flow";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = getSafeRedirect(searchParams.get("redirect"));
  const isOrderAuth = searchParams.get("reason") === "order";
  const accountCreated = searchParams.get("verified") === "true";
  const { signIn, loading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const { error, data } = await signIn(email, password);

    if (error) {
      setError(error);
    } else {
      const userRole = data?.user?.id ? await getUserRole(data.user.id) : "customer";
      router.push(userRole === "admin" ? "/admin/dashboard" : redirectParam);
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
              SIGN IN
            </h1>
            <p className="text-gray-500 text-xs mt-1">Welcome back to Eskort Umcimbi Planner</p>
          </div>

          {isOrderAuth && (
            <p role="alert" className="mb-5 rounded-md border border-eskort-yellow/40 bg-eskort-yellow/10 p-3 text-sm text-eskort-yellow">
              {ORDER_AUTH_MESSAGE}
            </p>
          )}
          {accountCreated && (
            <p role="status" className="mb-5 rounded-md border border-green-700/50 bg-green-900/20 p-3 text-sm text-green-300">
              Account created. Check your email to verify it, then sign in to continue.
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
                  placeholder="Password"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full btn-primary py-3 text-base font-bold tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-center text-gray-500 text-xs mt-6">
            Don't have an account?{" "}
            <Link href={`/signup?redirect=${encodeURIComponent(redirectParam)}${isOrderAuth ? "&reason=order" : ""}`} className="text-eskort-yellow font-semibold hover:underline">
              Create an account
            </Link>
          </p>

          <Link
            href="/forgot-password"
            className="block text-center text-eskort-yellow text-xs font-medium mt-4 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
      </div>
    </div>
  );
}