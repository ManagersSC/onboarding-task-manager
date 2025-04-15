import { Inter } from "next/font/google"
import { Toaster } from "@components/ui/toaster"
import { ThemeProvider } from "@components/theme-provider"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "SC - Task Management",
  description: "Manage your onboarding tasks",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-[#f8f9fa]`}>
        <ThemeProvider defaultTheme="dark" storageKey="admin-theme">
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}

