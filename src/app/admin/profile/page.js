"use client"

import { useEffect } from "react"
import { useState } from "react"
import { motion } from "framer-motion"
import { useProfile } from "@/hooks/use-profile"
import { useTheme } from "@components/theme-provider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@components/ui/avatar"
import { Button } from "@components/ui/button"
import { Input } from "@components/ui/input"
import { Label } from "@components/ui/label"
import { Switch } from "@components/ui/switch"
import { Separator } from "@components/ui/separator"
import { Skeleton } from "@components/ui/skeleton"
import { Badge } from "@components/ui/badge"
import { AlertCircle, Bell, Edit, Mail, Moon, Save, Sun, UserCog, Lock, Shield } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@components/ui/alert"
import React from "react"

export default function ProfilePage() {
  const { profile, loading, error } = useProfile()
  const { theme, setTheme } = useTheme()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    jobTitle: "Onboarding Manager",
  })

  // Notification preferences
  const [notifications, setNotifications] = useState({
    email: true,
    slack: true,
    newHires: true,
    taskAssignments: true,
    taskCompletions: true,
  })

  // Update form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData((prev) => ({
        ...prev,
        name: profile.name,
        email: profile.email,
      }))
    }
  }, [profile])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleNotificationChange = (key) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleSaveProfile = () => {
    // Here you would typically send the updated profile to your API
    console.log("Saving profile:", formData)
    setIsEditing(false)
    // Show success message or handle errors
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  }

  if (error) {
    return (
      <div className="flex flex-col w-full min-h-screen bg-background p-4 md:p-6">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load profile data. Please try again later.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full min-h-screen bg-background">
      <div className="p-4 md:p-6 w-full">
        <motion.div initial="hidden" animate="visible" variants={containerVariants} className="w-full mx-auto">
          <motion.div variants={itemVariants}>
            <h1 className="text-2xl font-bold mb-6">Profile Settings</h1>
          </motion.div>

          {loading ? (
            <ProfileSkeleton />
          ) : (
            <Tabs defaultValue="personal" className="w-full">
              <div className="flex justify-center mb-6">
                <TabsList className="w-auto">
                  <TabsTrigger value="personal">Personal Info</TabsTrigger>
                  <TabsTrigger value="preferences">Preferences</TabsTrigger>
                  {/* <TabsTrigger value="security">Security</TabsTrigger> */}
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>
              </div>

              {/* Personal Information Tab */}
              <TabsContent value="personal" className="w-full">
                <motion.div variants={itemVariants} className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 w-full">
                  <Card className="md:col-span-1 lg:col-span-2 w-full">
                    <CardHeader className="flex flex-row items-start justify-between">
                      <div>
                        <CardTitle>Personal Information</CardTitle>
                        <CardDescription>Manage your personal details and contact information</CardDescription>
                      </div>
                      <Button
                        variant={isEditing ? "default" : "outline"}
                        size="sm"
                        onClick={() => (isEditing ? handleSaveProfile() : setIsEditing(true))}
                      >
                        {isEditing ? (
                          <>
                            <Save className="mr-2 h-4 w-4" /> Save
                          </>
                        ) : (
                          <>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </>
                        )}
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex flex-col items-center gap-4">
                          <Avatar className="h-24 w-24">
                            <AvatarImage src="/placeholder.svg" alt={profile.name} />
                            <AvatarFallback className="text-2xl">
                              {profile.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          {isEditing && (
                            <Button variant="outline" size="sm">
                              Change Photo
                            </Button>
                          )}
                          <Badge variant="outline" className="mt-2">
                            {profile.role}
                          </Badge>
                        </div>

                        <div className="flex-1 space-y-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="name">Full Name</Label>
                              <Input
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                disabled={!isEditing}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="email">Email</Label>
                              <Input
                                id="email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                disabled={!isEditing}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="jobTitle">Job Title</Label>
                              <Input
                                id="jobTitle"
                                name="jobTitle"
                                value={formData.jobTitle}
                                onChange={handleInputChange}
                                disabled={!isEditing}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>

              {/* Preferences Tab */}
              <TabsContent value="preferences" className="w-full">
                <motion.div variants={itemVariants} className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 w-full">
                  <Card className="w-full">
                    <CardHeader className="pb-2">
                      <CardTitle>Appearance</CardTitle>
                      <CardDescription>Customize how the application looks</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                          <Label htmlFor="theme-toggle">Theme Mode</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-muted-foreground">Light</span>
                          <Switch
                            id="theme-toggle"
                            checked={theme === "dark"}
                            onCheckedChange={() => setTheme(theme === "dark" ? "light" : "dark")}
                          />
                          <span className="text-sm text-muted-foreground">Dark</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="w-full">
                    <CardHeader className="pb-2">
                      <CardTitle>Notifications</CardTitle>
                      <CardDescription>Configure how you want to receive notifications</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <h3 className="text-sm font-medium">Notification Channels</h3>
                        <div className="grid gap-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <Label htmlFor="email-notifications" className="text-sm">
                                Email Notifications
                              </Label>
                            </div>
                            <Switch
                              id="email-notifications"
                              checked={notifications.email}
                              onCheckedChange={() => handleNotificationChange("email")}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Bell className="h-4 w-4 text-muted-foreground" />
                              <Label htmlFor="slack-notifications" className="text-sm">
                                Slack Notifications
                              </Label>
                            </div>
                            <Switch
                              id="slack-notifications"
                              checked={notifications.slack}
                              onCheckedChange={() => handleNotificationChange("slack")}
                            />
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <h3 className="text-sm font-medium">Notification Types</h3>
                        <div className="grid gap-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="new-hires" className="text-sm">
                              New Hires
                            </Label>
                            <Switch
                              id="new-hires"
                              checked={notifications.newHires}
                              onCheckedChange={() => handleNotificationChange("newHires")}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <Label htmlFor="task-assignments" className="text-sm">
                              Task Assignments
                            </Label>
                            <Switch
                              id="task-assignments"
                              checked={notifications.taskAssignments}
                              onCheckedChange={() => handleNotificationChange("taskAssignments")}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <Label htmlFor="task-completions" className="text-sm">
                              Task Completions
                            </Label>
                            <Switch
                              id="task-completions"
                              checked={notifications.taskCompletions}
                              onCheckedChange={() => handleNotificationChange("taskCompletions")}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>

              {/* Security Tab - Commented out as requested */}
              {/* <TabsContent value="security" className="w-full">
                <motion.div variants={itemVariants} className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 w-full">
                  <Card className="w-full">
                    <CardHeader>
                      <CardTitle>Password</CardTitle>
                      <CardDescription>Change your password and manage account security</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="current-password">Current Password</Label>
                        <div className="relative">
                          <Input id="current-password" type="password" />
                          <Button variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3">
                            <EyeOff className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <div className="relative">
                          <Input id="new-password" type="password" />
                          <Button variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3">
                            <EyeOff className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                        <div className="relative">
                          <Input id="confirm-password" type="password" />
                          <Button variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3">
                            <EyeOff className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <Button className="w-full">Update Password</Button>
                    </CardContent>
                  </Card>

                  <Card className="w-full">
                    <CardHeader>
                      <CardTitle>Security Settings</CardTitle>
                      <CardDescription>Manage your account security preferences</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center">
                            <Shield className="h-4 w-4 mr-2 text-muted-foreground" />
                            <Label className="text-base">Two-Factor Authentication</Label>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Add an extra layer of security to your account
                          </p>
                        </div>
                        <Button variant="outline">Enable</Button>
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center">
                            <Key className="h-4 w-4 mr-2 text-muted-foreground" />
                            <Label className="text-base">Active Sessions</Label>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Manage devices where you're currently logged in
                          </p>
                        </div>
                        <Button variant="outline">Manage</Button>
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center">
                            <Lock className="h-4 w-4 mr-2 text-muted-foreground" />
                            <Label className="text-base">Account Access</Label>
                          </div>
                          <p className="text-sm text-muted-foreground">Control who has access to your account</p>
                        </div>
                        <Button variant="outline">Review</Button>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button variant="destructive" className="w-full">
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out From All Devices
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              </TabsContent> */}

              {/* Activity Tab */}
              <TabsContent value="activity" className="w-full">
                <motion.div variants={itemVariants} className="w-full">
                  <Card className="w-full">
                    <CardHeader>
                      <CardTitle>Recent Activity</CardTitle>
                      <CardDescription>View your recent account activity and login history</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-8">
                        {[...Array(5)].map((_, i) => {
                          const activityIcon = getActivityIcon(i)
                          return (
                            <div key={i} className="flex items-start gap-4">
                              <div className={`p-2 rounded-full ${activityIcon.color}`}>
                                {React.createElement(activityIcon.icon, { className: "h-4 w-4" })}
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm font-medium">{getActivityDescription(i)}</p>
                                <div className="flex items-center text-xs text-muted-foreground">
                                  <p>{getActivityTime(i)}</p>
                                  <span className="mx-2">•</span>
                                  <p>{getActivityLocation(i)}</p>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" className="w-full">
                        View All Activity
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              </TabsContent>
            </Tabs>
          )}
        </motion.div>
      </div>
    </div>
  )
}

// Helper function to generate activity icons
function getActivityIcon(index) {
  const icons = [
    { icon: UserCog, color: "bg-blue-100 text-blue-500 dark:bg-blue-900/20" },
    { icon: Lock, color: "bg-green-100 text-green-500 dark:bg-green-900/20" },
    { icon: Mail, color: "bg-purple-100 text-purple-500 dark:bg-purple-900/20" },
    { icon: Shield, color: "bg-amber-100 text-amber-500 dark:bg-amber-900/20" },
    { icon: Bell, color: "bg-red-100 text-red-500 dark:bg-red-900/20" },
  ]
  return icons[index % icons.length]
}

// Helper function to generate activity descriptions
function getActivityDescription(index) {
  const descriptions = [
    "Profile information updated",
    "Password changed successfully",
    "Email notification preferences updated",
    "Security settings reviewed",
    "New browser login detected",
  ]
  return descriptions[index % descriptions.length]
}

// Helper function to generate activity times
function getActivityTime(index) {
  const times = ["Just now", "10 minutes ago", "1 hour ago", "Yesterday at 3:45 PM", "May 10, 2023 at 9:30 AM"]
  return times[index % times.length]
}

// Helper function to generate activity locations
function getActivityLocation(index) {
  const locations = ["Chrome on Windows", "Safari on macOS", "Firefox on Windows", "Chrome on Android", "Safari on iOS"]
  return locations[index % locations.length]
}

// Skeleton loader for profile page
function ProfileSkeleton() {
  return (
    <div className="space-y-6 w-full">
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 w-full">
        <div className="md:col-span-1 lg:col-span-2 p-6 border rounded-lg w-full">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex flex-col items-center gap-4">
              <Skeleton className="h-24 w-24 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>

            <div className="flex-1 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
