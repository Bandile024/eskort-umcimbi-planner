"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Lock, ChevronLeft } from "lucide-react";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, loading: authLoading, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const redirect = searchParams.get("redirect") || "/admin/dashboard";

  useEffect(() => {
    if (!authLoading && user) {
      const isAdmin = user.email?.toLowerCase() === "admin@eskortstore.co.za";
      if (isAdmin) {
        router.push(redirect);
        return;
      }
      checkRole().then((role) => {
        if (role === "admin") {
          router.push(redirect);
        } else {
          router.push("/");
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
        return;
      }

      const isAdminEmail = email.trim().toLowerCase() === "admin@eskortstore.co.za";
      // Use server-side API to check role - avoids client-side cookie/RLS issues
      const userRole = await checkRole();
      console.log("[AdminLogin] checkRole returned:", userRole);
      if (!isAdminEmail && userRole !== "admin") {
        setError("Access denied. Admin privileges required.");
        return;
      }

      router.push(redirect);
    } catch (err: any) {
      console.error("Admin login error:", err);
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
          <div className="w-16 h-16 bg-eskort-red rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={28} className="text-white" />
          </div>
          <h1 className="font-display text-5xl md:text-6xl text-white tracking-wide leading-none">
            ADMIN LOGIN
          </h1>
          <p className="text-gray-500 text-sm mt-2">Access the Eskort admin dashboard</p>
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
              placeholder="admin@eskort.co.za"
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

          <button
            type="submit"
            disabled={isLoading || authLoading}
            className="w-full btn-primary py-3 text-base font-bold tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Signing in..." : "Sign In to Admin"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-eskort-dark-bg flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
