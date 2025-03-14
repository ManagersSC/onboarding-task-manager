"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@components/ui/card"
import { LoginForm } from "./LoginForm"
import { SignUpForm } from "./SignUpForm"
import { useSearchParams } from "next/navigation"

export function AuthComponent() {
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
      {/* Login and Sign Up Tabs */}
      {/* <div className="grid grid-cols-2 border-b">
        <Button
          variant="ghost"
          className={`rounded-none py-3 ${isLogin ? "bg-background border-b-2 border-primary font-medium" : "bg-muted/50 text-muted-foreground"}`}
          onClick={() => setIsLogin(true)}
        >
          Login
        </Button>
        <Button
          variant="ghost"
          className={`rounded-none py-3 ${!isLogin ? "bg-background border-b-2 border-primary font-medium" : "bg-muted/50 text-muted-foreground"}`}
          onClick={() => setIsLogin(false)}
        >
          Sign Up
        </Button>
      </div> */}

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

