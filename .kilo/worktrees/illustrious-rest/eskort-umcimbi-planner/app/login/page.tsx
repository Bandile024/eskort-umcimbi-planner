"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ChevronLeft } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, loading: authLoading, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const redirect = searchParams.get("redirect") || "/";

  useEffect(() => {
    if (!authLoading && user) {
      checkRole().then((role) => {
        if (role === "admin") {
          router.push("/admin/dashboard");
        } else {
          router.push(redirect);
        }
      });
    }
  }, [user, authLoading, router, redirect]);

  const checkRole = async () => {
    try {
      const res = await fetch("/api/auth/check-role", { method: "POST", credentials: "include" });
      const data = await res.json();
      return data.role || "customer";
    } catch {
      return "customer";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        setError(signInError);
      } else {
        // Use server-side API to check role - avoids client-side cookie/RLS issues
        const userRole = await checkRole();
        console.log("[Login] checkRole returned:", userRole);
        if (userRole === "admin") {
          router.push("/admin/dashboard");
        } else {
          router.push(redirect);
        }
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err?.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-eskort-dark-bg flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-eskort-dark-bg flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-eskort-yellow text-sm font-semibold mb-8 hover:opacity-80"
        >
          <ChevronLeft size={16} />
          Back
        </Link>

        <div className="text-center mb-8">
          <h1 className="font-display text-5xl md:text-6xl text-white tracking-wide leading-none">
            SIGN IN
          </h1>
          <p className="text-gray-500 text-sm mt-2">Welcome back to your Eskort account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-gray-400 text-xs font-medium uppercase tracking-wide mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-eskort-dark-card-2 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-eskort-yellow transition-colors"
              placeholder="you@example.com"
              disabled={isLoading || authLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-gray-400 text-xs font-medium uppercase tracking-wide mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-eskort-dark-card-2 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-eskort-yellow transition-colors"
              placeholder="••••••••"
              disabled={isLoading || authLoading}
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="accent-eskort-yellow" />
              <span className="text-gray-400 text-xs">Remember me</span>
            </label>
            <Link
              href="/forgot-password"
              className="text-eskort-yellow text-xs font-medium hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading || authLoading}
            className="w-full btn-primary py-3 text-base font-bold tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-gray-500 text-xs mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-eskort-yellow font-semibold hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
