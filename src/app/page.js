import { AuthComponent } from "@components/auth/AuthComponent"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Welcome Back</h1>
          <p className="text-muted-foreground mt-2">Sign in to your account or create a new one</p>
        </div>
        <AuthComponent />
      </div>
    </main>
  )
}

