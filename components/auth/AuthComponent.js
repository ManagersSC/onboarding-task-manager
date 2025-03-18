"use client"

import { Suspense, useEffect, useState } from "react"
import { Card, CardContent } from "@components/ui/card"
import { Skeleton } from "@components/ui/skeleton"
import { LoginForm } from "./LoginForm"
import { SignUpForm } from "./SignUpForm"
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
  const searchParams = useSearchParams();
  const initialIsLogin = searchParams.get("mode") === "register" ? false : true

  const [isLogin, setIsLogin] = useState(initialIsLogin);

  useEffect(() => {
    if(searchParams.get("mode") === "register"){
      setIsLogin(false)
    } else {
      setIsLogin(true)
    }
  }, [searchParams]);

  return (
    <Card className="border shadow-md overflow-hidden">
      {/* The Forms */}
      <CardContent className="p-6">
        {isLogin ? (
          <LoginForm onSignUpClick={() => setIsLogin(false)} />
        ) : (
          <SignUpForm onLoginClick={() => setIsLogin(true)} />
        )}
      </CardContent>
    </Card>
  )
}