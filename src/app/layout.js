import { Inter } from "next/font/google"
import { Toaster } from "sonner"
import { ThemeProvider } from "@components/theme-provider"
import "./globals.css"
import AppToaster from "@components/AppToaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "SC - Task Management",
  description: "Manage your onboarding tasks",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-background`}>
        <ThemeProvider defaultTheme="dark" storageKey="admin-theme">
          {children}
          <AppToaster />
        </ThemeProvider>
      </body>
    </html>
  )
}

