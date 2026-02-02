"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@components/ui/button"
import { Input } from "@components/ui/input"
import { Label } from "@components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@components/ui/card"
import { Alert, AlertDescription } from "@components/ui/alert"
import { GradientBackground } from "@components/ui/gradient-background"
import { Loader2, ArrowLeft, Eye, EyeOff, Lock, CheckCircle2 } from "lucide-react"

// Loading fallback component
function ResetPasswordSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 bg-muted rounded animate-pulse" />
      <div className="space-y-2">
        <div className="h-4 w-24 bg-muted rounded animate-pulse" />
        <div className="h-11 w-full bg-muted rounded-lg animate-pulse" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
        <div className="h-11 w-full bg-muted rounded-lg animate-pulse" />
      </div>
      <div className="h-11 w-full bg-muted rounded-lg animate-pulse mt-6" />
    </div>
  )
}

// Form validation schema
const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, { message: "Password must be at least 8 characters" })
      .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
      .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
      .regex(/[0-9]/, { message: "Password must contain at least one number" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })

const ResetPasswordForm = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [resetToken, setResetToken] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  })

  useEffect(() => {
    // Get token from URL query parameter
    const token = searchParams.get("token")
    if (!token) {
      setError("Reset token is missing. Please request a new password reset link.")
    } else {
      setResetToken(token)
    }
  }, [searchParams])

  const onSubmit = async (data) => {
    if (!resetToken) {
      setError("Reset token is missing. Please request a new password reset link.")
      return
    }

    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resetToken,
          newPassword: data.newPassword,
          confirmPassword: data.confirmPassword,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to reset password")
      }

      setSuccess("Your password has been reset successfully. You can now log in with your new password.")

      // Redirect to login page after 3 seconds
      setTimeout(() => {
        router.push("/")
      }, 3000)
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card variant="glass" className="shadow-elevated-lg">
      <CardHeader>
        <CardTitle className="text-lg">Reset Password</CardTitle>
        <CardDescription>Enter your new password below.</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4 border-error/30 bg-error-muted">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="mb-4 bg-success-muted text-success border-success/30">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Enter your new password"
                  className="pl-10 pr-10 h-11"
                  {...register("newPassword")}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span className="sr-only">{showNewPassword ? "Hide password" : "Show password"}</span>
                </button>
              </div>
              {errors.newPassword && <p className="text-sm text-error">{errors.newPassword.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your new password"
                  className="pl-10 pr-10 h-11"
                  {...register("confirmPassword")}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span className="sr-only">{showConfirmPassword ? "Hide password" : "Show password"}</span>
                </button>
              </div>
              {errors.confirmPassword && <p className="text-sm text-error">{errors.confirmPassword.message}</p>}
            </div>
          </div>
          <Button type="submit" className="w-full mt-6 h-11" disabled={isLoading || !resetToken}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetting Password...
              </>
            ) : (
              "Reset Password"
            )}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => router.push("/forgot-password")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Forgot Password
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ResetPasswordPage() {
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
            Smile Clinique
          </h1>
          <p className="text-muted-foreground mt-2 text-body-sm">
            Create your new password
          </p>
        </div>

        <Suspense fallback={
          <Card variant="glass" className="shadow-elevated-lg">
            <CardContent className="p-6">
              <ResetPasswordSkeleton />
            </CardContent>
          </Card>
        }>
          <ResetPasswordForm />
        </Suspense>

        <p className="text-center text-caption text-muted-foreground/60 mt-8">
          Secure login powered by Smile Clinique
        </p>
      </main>
    </GradientBackground>
  )
}
