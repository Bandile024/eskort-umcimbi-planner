"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { ChevronLeft } from "lucide-react"

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { updatePassword, loading: authLoading } = useAuth()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isValid, setIsValid] = useState(false)

  useEffect(() => {
    const code = searchParams.get("code")
    if (!code) {
      setError("Invalid or missing reset code")
      setIsValid(false)
    } else {
      setIsValid(true)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!isValid) return

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    setIsLoading(true)

    const { error } = await updatePassword(password)
    if (error) {
      setError(error)
    } else {
      setSuccess(true)
    }
    setIsLoading(false)
  }

  if (!isValid && !error) {
    return (
      <div className="min-h-screen bg-eskort-dark-bg flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">
            Invalid or missing reset code
          </div>
        </div>
      </div>
    )
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
            RESET PASSWORD
          </h1>
          <p className="text-gray-500 text-sm mt-2">Enter your new password</p>
        </div>

        {success ? (
          <div className="space-y-4">
            <div className="bg-green-900/30 border border-green-700 text-green-300 px-4 py-3 rounded-lg text-sm">
              Password has been reset successfully!
            </div>
            <button
              onClick={() => router.push("/login")}
              className="w-full btn-primary py-3 text-base font-bold tracking-widest"
            >
              Go to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {error && (
              <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-gray-400 text-xs font-medium uppercase tracking-wide mb-1">
                New Password
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
                Confirm New Password
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
              {isLoading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-eskort-dark-bg flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  )
}