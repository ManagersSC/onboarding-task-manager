"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@components/ui/button"
import { Input } from "@components/ui/input"
import { Label } from "@components/ui/label"
import { Alert, AlertDescription } from "@components/ui/alert"
import { Badge } from "@components/ui/badge"
import { Loader2, Eye, EyeOff, Mail, Lock, AlertCircle, ShieldAlert } from "lucide-react"
import { cn } from "@components/lib/utils"

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(1, "Password is required"),
})

export function AdminLoginForm({ onSuccess, onUserLoginClick }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [focusedField, setFocusedField] = useState(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const onSubmit = async (data) => {
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const result = await response.json()
        const errorMsg = result?.userError || result?.error || `Something went wrong. Error code: ${response.status}`
        setError(errorMsg)
        return
      }

      // Success - redirect to admin dashboard
      router.push("/admin/dashboard")
      if (onSuccess) onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Admin badge indicator */}
      <div className="flex items-center justify-center gap-2 py-2">
        <Badge variant="secondary" className="gap-1.5 px-3 py-1">
          <ShieldAlert className="h-3.5 w-3.5" />
          Administrator Access
        </Badge>
      </div>

      {error && (
        <Alert variant="destructive" className="animate-fade-in-up border-error/30 bg-error-muted">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="admin-email" className="text-sm font-medium">
            Admin Email
          </Label>
          <div className="relative">
            <div className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-base",
              focusedField === "email" ? "text-primary" : "text-muted-foreground"
            )}>
              <Mail className="h-4 w-4" />
            </div>
            <Input
              id="admin-email"
              type="email"
              placeholder="admin@example.com"
              className={cn(
                "pl-10 h-11",
                errors.email && "border-error focus-visible:ring-error/30"
              )}
              onFocus={() => setFocusedField("email")}
              onBlur={() => setFocusedField(null)}
              {...register("email")}
            />
          </div>
          {errors.email && (
            <p className="text-sm text-error flex items-center gap-1 animate-fade-in">
              <AlertCircle className="h-3 w-3" />
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="admin-password" className="text-sm font-medium">
              Password
            </Label>
            <Button
              type="button"
              variant="link"
              className="p-0 h-auto text-xs text-muted-foreground hover:text-primary"
              onClick={() => router.push("/forgot-password")}
            >
              Forgot password?
            </Button>
          </div>
          <div className="relative">
            <div className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-base",
              focusedField === "password" ? "text-primary" : "text-muted-foreground"
            )}>
              <Lock className="h-4 w-4" />
            </div>
            <Input
              id="admin-password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              className={cn(
                "pl-10 pr-10 h-11",
                errors.password && "border-error focus-visible:ring-error/30"
              )}
              onFocus={() => setFocusedField("password")}
              onBlur={() => setFocusedField(null)}
              {...register("password")}
            />
            <button
              type="button"
              className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-base",
                "text-muted-foreground hover:text-foreground focus:outline-none focus:text-primary"
              )}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-error flex items-center gap-1 animate-fade-in">
              <AlertCircle className="h-3 w-3" />
              {errors.password.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full h-11 text-sm font-medium mt-6"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign In as Admin"
          )}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border/60" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">or</span>
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Not an admin?{" "}
        <Button
          variant="link"
          className="p-0 h-auto font-medium text-primary hover:text-primary/80"
          onClick={onUserLoginClick}
        >
          User Login
        </Button>
      </p>
    </div>
  )
}
