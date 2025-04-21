"use client"

import { useState, useEffect, useCallback } from "react"
import { User, LogOut, Sun, Moon, Laptop } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@components/ui/dialog"
import { Button } from "@components/ui/button"
import { Avatar, AvatarFallback } from "@components/ui/avatar"
import { Skeleton } from "@components/ui/skeleton"
import { useRouter } from "next/navigation"
import { Separator } from "@components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@components/ui/alert-dialog"
import { useTheme } from "@components/theme-provider"
import { RadioGroup, RadioGroupItem } from "@components/ui/radio-group"
import { Label } from "@components/ui/label"
import { toast } from "@/hooks/use-toast"

export function ProfileActions() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchProfile = useCallback(async () => {
    if (profile) return
    setLoading(true)
    try {
      const response = await fetch("/api/user")
      if (!response.ok) throw new Error("Failed to fetch profile")
      const data = await response.json()
      setProfile(data)
    } catch (error) {
      console.error("Error fetching profile:", error)
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => {
    if (isOpen) {
      fetchProfile()
    }
  }, [isOpen, fetchProfile])

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/logout", { method: "POST" })
      if (!response.ok) throw new Error("Failed to logout")
      setProfile(null)
      router.push("/login")
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  const handleResetPassword = () => {
    router.push("/forgot-password")
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative" onClick={() => setIsOpen(true)}>
          <Avatar className="h-8 w-8">
            <AvatarFallback>{profile?.name?.[0] || <User className="h-4 w-4" />}</AvatarFallback>
          </Avatar>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsLogoutDialogOpen(true)}
          className="text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-5 w-5" />
          <span className="sr-only">Logout</span>
        </Button>
      </div>

      {/* Profile Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-4 w-[150px]" />
              </div>
            ) : profile ? (
              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{profile.name?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold">{profile.name || "User"}</h4>
                    <p className="text-sm text-muted-foreground">{profile.job || "No job title"}</p>
                    <p className="text-sm text-muted-foreground">{profile.email || "No email"}</p>
                  </div>
                </div>
                <Separator />

                {/* Theme Toggle Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Sun className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Appearance</span>
                    </div>
                  </div>

                  <ThemeSelector />
                </div>
                <Separator />

                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleResetPassword} className="flex-1">
                    Reset Password
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setIsOpen(false)
                      setIsLogoutDialogOpen(true)
                    }}
                    className="flex-1"
                  >
                    Logout
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Failed to load profile</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
            <AlertDialogDescription>You will be redirected to the login page.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>Logout</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// Add this ThemeSelector component inside the ProfileActions.js file
function ThemeSelector() {
  const { theme, setTheme } = useTheme()

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme)
    toast({
      title: "Theme updated",
      description: `Theme changed to ${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)}`,
      duration: 2000,
    })
  }

  return (
    <RadioGroup value={theme} onValueChange={handleThemeChange} className="grid grid-cols-3 gap-2">
      <div>
        <RadioGroupItem value="light" id="theme-light" className="peer sr-only" />
        <Label
          htmlFor="theme-light"
          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
        >
          <Sun className="h-5 w-5 mb-2" />
          <span className="text-xs font-medium">Light</span>
        </Label>
      </div>

      <div>
        <RadioGroupItem value="dark" id="theme-dark" className="peer sr-only" />
        <Label
          htmlFor="theme-dark"
          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
        >
          <Moon className="h-5 w-5 mb-2" />
          <span className="text-xs font-medium">Dark</span>
        </Label>
      </div>

      <div>
        <RadioGroupItem value="system" id="theme-system" className="peer sr-only" />
        <Label
          htmlFor="theme-system"
          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
        >
          <Laptop className="h-5 w-5 mb-2" />
          <span className="text-xs font-medium">System</span>
        </Label>
      </div>
    </RadioGroup>
  )
}
