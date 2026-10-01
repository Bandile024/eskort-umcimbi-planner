"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { ChevronLeft } from "lucide-react"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const { resetPassword, loading: authLoading } = useAuth()
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess(false)
    setIsLoading(true)

    const { error } = await resetPassword(email)
    if (error) {
      setError(error)
    } else {
      setSuccess(true)
    }
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-eskort-dark-bg flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-eskort-yellow text-sm font-semibold mb-8 hover:opacity-80"
        >
          <ChevronLeft size={16} />
          Back
        </Link>

        <div className="text-center mb-8">
          <h1 className="font-display text-5xl md:text-6xl text-white tracking-wide leading-none">
            FORGOT PASSWORD
          </h1>
          <p className="text-gray-500 text-sm mt-2">Enter your email to reset your password</p>
        </div>

        {success ? (
          <div className="bg-green-900/30 border border-green-700 text-green-300 px-4 py-3 rounded-lg text-sm mb-4">
            Password reset email sent! Check your inbox.
          </div>
        ) : (
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

            <button
              type="submit"
              disabled={isLoading || authLoading}
              className="w-full btn-primary py-3 text-base font-bold tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}

        <p className="text-center text-gray-500 text-xs mt-6">
          Remember your password?{" "}
          <Link href="/login" className="text-eskort-yellow font-semibold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}