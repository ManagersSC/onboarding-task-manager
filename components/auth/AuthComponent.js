"use client"

import { Suspense, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs"
import { Skeleton } from "@components/ui/skeleton"
import { LoginForm } from "./LoginForm"
import { SignUpForm } from "./SignUpForm"
import { AdminLoginForm } from "./AdminLoginForm"
import { useSearchParams } from "next/navigation"

export function AuthComponent() {
  return (
    <Suspense
      fallback={
        <Card className="border shadow-md overflow-hidden">
          <CardContent className="p-6">
            <Skeleton className="h-8 w-full mb-4" />
            <Skeleton className="h-10 w-full mb-4" />
            <Skeleton className="h-10 w-full mb-4" />
            <Skeleton className="h-10 w-full" />
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
    <Card className="border shadow-md overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-center text-2xl">Welcome</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="login">User Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <LoginForm onSignUpClick={() => setActiveTab("signup")} />
          </TabsContent>
          <TabsContent value="signup">
            <SignUpForm onLoginClick={() => setActiveTab("login")} />
          </TabsContent>
          <TabsContent value="admin">
            <AdminLoginForm onUserLoginClick={() => setActiveTab("login")} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}