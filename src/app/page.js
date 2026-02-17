import { AuthComponent } from "@components/auth/AuthComponent"
import { GradientBackground } from "@components/ui/gradient-background"

export default function Home() {
  return (
    <GradientBackground
      variant="mesh"
      className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 md:p-8"
    >
      <main className="w-full max-w-md animate-fade-in-up">
        {/* Logo / Brand Section */}
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
            Sign in to your account or create a new one
          </p>
        </div>

        <AuthComponent />
      </main>
    </GradientBackground>
  )
}

