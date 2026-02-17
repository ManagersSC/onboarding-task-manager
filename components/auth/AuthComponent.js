"use client"

import { Suspense, useState } from "react"
import { Card, CardContent } from "@components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs"
import { Skeleton } from "@components/ui/skeleton"
import { LoginForm } from "./LoginForm"
import { SignUpForm } from "./SignUpForm"
import { AdminLoginForm } from "./AdminLoginForm"
import { useSearchParams } from "next/navigation"
import { cn } from "@components/lib/utils"
import { User, UserPlus, Shield } from "lucide-react"

export function AuthComponent() {
  return (
    <Suspense
      fallback={
        <Card variant="glass" className="overflow-hidden">
          <CardContent className="p-6 sm:p-8">
            <Skeleton className="h-10 w-full mb-6 rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          </CardContent>
        </Card>
      }
    >
      <AuthForm />
    </Suspense>
  )
}

const AuthForm = () => {
  const searchParams = useSearchParams()
  const initialTab =
    searchParams.get("mode") === "register" ? "signup" : searchParams.get("mode") === "admin" ? "admin" : "login"

  const [activeTab, setActiveTab] = useState(initialTab)

  return (
    <Card variant="glass" className="overflow-hidden shadow-elevated-lg animate-scale-in">
      <CardContent className="p-6 sm:p-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Custom styled tabs with underline animation */}
          <TabsList className="grid w-full grid-cols-3 mb-6 h-auto p-1 bg-muted/50 rounded-lg gap-1">
            <TabsTrigger
              value="login"
              className={cn(
                "relative py-2.5 px-3 rounded-md text-sm font-medium transition-all duration-base",
                "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
                "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground/80",
                "flex items-center justify-center gap-2"
              )}
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">User</span>
              <span className="sm:hidden">Login</span>
            </TabsTrigger>
            <TabsTrigger
              value="signup"
              className={cn(
                "relative py-2.5 px-3 rounded-md text-sm font-medium transition-all duration-base",
                "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
                "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground/80",
                "flex items-center justify-center gap-2"
              )}
            >
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Up</span>
              <span className="sm:hidden">New</span>
            </TabsTrigger>
            <TabsTrigger
              value="admin"
              className={cn(
                "relative py-2.5 px-3 rounded-md text-sm font-medium transition-all duration-base",
                "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
                "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground/80",
                "flex items-center justify-center gap-2"
              )}
            >
              <Shield className="h-4 w-4" />
              <span>Admin</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-0 animate-fade-in">
            <LoginForm onSignUpClick={() => setActiveTab("signup")} />
          </TabsContent>
          <TabsContent value="signup" className="mt-0 animate-fade-in">
            <SignUpForm onLoginClick={() => setActiveTab("login")} />
          </TabsContent>
          <TabsContent value="admin" className="mt-0 animate-fade-in">
            <AdminLoginForm onUserLoginClick={() => setActiveTab("login")} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}