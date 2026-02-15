"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@components/ui/card"
import { Input } from "@components/ui/input"
import { Button } from "@components/ui/button"
import { Label } from "@components/ui/label"
import { GradientBackground } from "@components/ui/gradient-background"
import { Loader2, Eye, EyeOff, ShieldAlert, Lock } from "lucide-react"
import { toast } from "sonner"

function AcceptAdminInviteInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [token, setToken] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    const t = searchParams.get("token")
    if (t) setToken(t)
  }, [searchParams])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    if (!token) {
      const msg = "Invite token missing. Please use the link from your email."
      setError(msg)
      return
    }
    if (!password || !confirmPassword) {
      const msg = "Please enter and confirm your password."
      setError(msg)
      return
    }
    const hasSpecial = /[^A-Za-z0-9]/.test(password)
    if (password.length < 8 || !hasSpecial) {
      const msg = "Password must be 8+ chars and include a special character."
      setError(msg)
      return
    }
    if (password !== confirmPassword) {
      const msg = "Passwords do not match."
      setError(msg)
      return
    }
    const forbiddenSequences = ["012", "123", "234", "345", "456", "567", "678", "789"]
    for (const seq of forbiddenSequences) {
      if (password.includes(seq)) {
        const msg = "Password cannot contain consecutive number sequences."
        setError(msg)
        return
      }
    }

    setIsLoading(true)
    try {
      const res = await fetch("/api/admin/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      })
      const result = await res.json()
      if (!res.ok) {
        const msg = result?.error || "Failed to set password"
        throw new Error(msg)
      }
      const successMsg = "Password set successfully. Redirecting to dashboard..."
      setSuccess(successMsg)
      toast.success(successMsg)
      router.push(result?.redirect || "/admin/dashboard")
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card variant="glass" className="shadow-elevated-lg">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
            <ShieldAlert className="h-4 w-4 text-primary" />
          </div>
          <span className="text-xs font-medium text-primary tracking-wide uppercase">
            Administrator Access
          </span>
        </div>
        <CardTitle className="text-lg">Set your admin password</CardTitle>
        <CardDescription>Complete your account setup to access the admin dashboard.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <div className="rounded-lg border border-error/30 bg-error-muted px-3 py-2.5">
              <p className="text-sm font-medium text-error">{error}</p>
            </div>
          ) : null}
          {success ? (
            <div className="rounded-lg border border-success/30 bg-success-muted px-3 py-2.5">
              <p className="text-sm font-medium text-success">{success}</p>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative w-full">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 h-11"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative w-full">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 pr-10 h-11"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowConfirm((v) => !v)}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span className="sr-only">{showConfirm ? "Hide password" : "Show password"}</span>
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full h-11" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting password...
              </>
            ) : (
              "Set Password"
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Token is valid for 24 hours. If expired, ask the admin to resend the invite.
      </CardFooter>
    </Card>
  )
}

export default function AcceptAdminInvitePage() {
  return (
    <GradientBackground
      variant="mesh"
      className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 md:p-8"
    >
      <main className="w-full max-w-md animate-fade-in-up">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <svg
              className="w-8 h-8 text-primary"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-display text-2xl sm:text-3xl font-bold tracking-tight">
            Smile Cliniq
          </h1>
          <p className="text-muted-foreground mt-2 text-body-sm">
            Set up your administrator account
          </p>
        </div>

        <Suspense fallback={
          <Card variant="glass" className="shadow-elevated-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        }>
          <AcceptAdminInviteInner />
        </Suspense>

        <p className="text-center text-caption text-muted-foreground/60 mt-8">
          Secure login powered by Smile Cliniq
        </p>
      </main>
    </GradientBackground>
  )
}
