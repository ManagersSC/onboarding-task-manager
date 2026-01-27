"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@components/ui/button"
import { Input } from "@components/ui/input"
import { Label } from "@components/ui/label"
import { Alert, AlertDescription } from "@components/ui/alert"
import { Loader2, Eye, EyeOff, Mail, Lock, ShieldCheck, AlertCircle, Check } from "lucide-react"
import { cn } from "@components/lib/utils"

const signUpSchema = z
  .object({
    email: z.string().email({ message: "Please enter a valid email address" }),
    password: z.string().min(6, { message: "Password must be at least 6 characters" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })

// Password strength checker
const getPasswordStrength = (password) => {
  if (!password) return { score: 0, label: "", color: "" }

  let score = 0
  if (password.length >= 6) score++
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { score: 1, label: "Weak", color: "bg-error" }
  if (score <= 2) return { score: 2, label: "Fair", color: "bg-warning" }
  if (score <= 3) return { score: 3, label: "Good", color: "bg-info" }
  return { score: 4, label: "Strong", color: "bg-success" }
}

export function SignUpForm({ onSuccess, onLoginClick }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [focusedField, setFocusedField] = useState(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  const password = useWatch({ control, name: "password" })
  const passwordStrength = useMemo(() => getPasswordStrength(password), [password])

  const onSubmit = async (data) => {
    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch("/api/sign-up", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.userError || result.error || "Failed to sign up")
      }

      // Redirect to dashboard on success
      router.push("/dashboard");
      if(onSuccess) onSuccess();
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {error && (
        <Alert variant="destructive" className="animate-fade-in-up border-error/30 bg-error-muted">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="animate-fade-in-up border-success/30 bg-success-muted text-success">
          <Check className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="signup-email" className="text-sm font-medium">
            Email
          </Label>
          <div className="relative">
            <div className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-base",
              focusedField === "email" ? "text-primary" : "text-muted-foreground"
            )}>
              <Mail className="h-4 w-4" />
            </div>
            <Input
              id="signup-email"
              type="email"
              placeholder="you@example.com"
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
          <Label htmlFor="signup-password" className="text-sm font-medium">
            Password
          </Label>
          <div className="relative">
            <div className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-base",
              focusedField === "password" ? "text-primary" : "text-muted-foreground"
            )}>
              <Lock className="h-4 w-4" />
            </div>
            <Input
              id="signup-password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a strong password"
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
          {/* Password strength indicator */}
          {password && (
            <div className="space-y-1.5 animate-fade-in">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={cn(
                      "h-1.5 flex-1 rounded-full transition-all duration-base",
                      level <= passwordStrength.score ? passwordStrength.color : "bg-muted"
                    )}
                  />
                ))}
              </div>
              <p className={cn(
                "text-xs",
                passwordStrength.score <= 1 && "text-error",
                passwordStrength.score === 2 && "text-warning",
                passwordStrength.score === 3 && "text-info",
                passwordStrength.score >= 4 && "text-success"
              )}>
                Password strength: {passwordStrength.label}
              </p>
            </div>
          )}
          {errors.password && (
            <p className="text-sm text-error flex items-center gap-1 animate-fade-in">
              <AlertCircle className="h-3 w-3" />
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-sm font-medium">
            Confirm Password
          </Label>
          <div className="relative">
            <div className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-base",
              focusedField === "confirmPassword" ? "text-primary" : "text-muted-foreground"
            )}>
              <ShieldCheck className="h-4 w-4" />
            </div>
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm your password"
              className={cn(
                "pl-10 pr-10 h-11",
                errors.confirmPassword && "border-error focus-visible:ring-error/30"
              )}
              onFocus={() => setFocusedField("confirmPassword")}
              onBlur={() => setFocusedField(null)}
              {...register("confirmPassword")}
            />
            <button
              type="button"
              className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-base",
                "text-muted-foreground hover:text-foreground focus:outline-none focus:text-primary"
              )}
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span className="sr-only">{showConfirmPassword ? "Hide password" : "Show password"}</span>
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-sm text-error flex items-center gap-1 animate-fade-in">
              <AlertCircle className="h-3 w-3" />
              {errors.confirmPassword.message}
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
              Creating account...
            </>
          ) : (
            "Create Account"
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
        Already have an account?{" "}
        <Button
          variant="link"
          className="p-0 h-auto font-medium text-primary hover:text-primary/80"
          onClick={onLoginClick}
        >
          Sign in
        </Button>
      </p>
    </div>
  )
}

