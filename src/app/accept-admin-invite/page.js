"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@components/ui/card"
import { Input } from "@components/ui/input"
import { Button } from "@components/ui/button"
import { Label } from "@components/ui/label"
import { Loader2, Eye, EyeOff } from "lucide-react"
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
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set your admin password</CardTitle>
          <CardDescription>Complete your account setup to access the admin dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error ? (
              <p className="text-sm font-medium text-red-500">{error}</p>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative w-full">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
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
                <Input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowConfirm((v) => !v)}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span className="sr-only">{showConfirm ? "Hide password" : "Show password"}</span>
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
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
    </div>
  )
}

export default function AcceptAdminInvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center p-6 text-sm text-muted-foreground">Loading…</div>}>
      <AcceptAdminInviteInner />
    </Suspense>
  )
}



