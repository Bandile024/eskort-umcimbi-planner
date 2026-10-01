"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { ChevronLeft } from "lucide-react"

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signUp, loading: authLoading } = useAuth()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const redirect = searchParams.get("redirect") || "/"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    setIsLoading(true)

    const { error } = await signUp(email, password, fullName)
    if (error) {
      setError(error)
      setIsLoading(false)
    } else {
      router.push(`/login?redirect=${encodeURIComponent(redirect)}&verified=true`)
    }
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
            CREATE ACCOUNT
          </h1>
          <p className="text-gray-500 text-sm mt-2">Join Eskort and start planning your braais</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="fullName" className="block text-gray-400 text-xs font-medium uppercase tracking-wide mb-1">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full bg-eskort-dark-card-2 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-eskort-yellow transition-colors"
              placeholder="John Doe"
              disabled={isLoading || authLoading}
            />
          </div>

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
              minLength={8}
              className="w-full bg-eskort-dark-card-2 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-eskort-yellow transition-colors"
              placeholder="••••••••"
              disabled={isLoading || authLoading}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-gray-400 text-xs font-medium uppercase tracking-wide mb-1">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
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
            {isLoading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-gray-500 text-xs mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-eskort-yellow font-semibold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-eskort-dark-bg flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  )
}