"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card"
import { Button } from "@components/ui/button"
import { Input } from "@components/ui/input"
import { Label } from "@components/ui/label"
import { Avatar, AvatarFallback } from "@components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs"
import { Separator } from "@components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@components/ui/dialog"
import { Alert, AlertDescription } from "@components/ui/alert"
import { Loader2, User, Mail, Key } from "lucide-react"

export default function AdminProfile() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false)
  const [newUserData, setNewUserData] = useState({
    name: "",
    email: "",
    password: "",
    isAdmin: true,
  })
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch("/api/admin/profile")
        if (response.ok) {
          const data = await response.json()
          setProfile(data)
        }
      } catch (error) {
        console.error("Error fetching profile:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  const handleAddUser = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/admin/create-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newUserData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to add user")
      }

      setSuccess("Admin user added successfully")
      setNewUserData({
        name: "",
        email: "",
        password: "",
        isAdmin: true,
      })

      setTimeout(() => {
        setIsAddUserDialogOpen(false)
        setSuccess("")
      }, 2000)
    } catch (error) {
      setError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetPassword = () => {
    router.push("/forgot-password")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Admin Profile</h1>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="admin">Admin Management</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="text-lg">{profile?.name?.[0] || "A"}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-medium">{profile?.name || "Admin User"}</h3>
                  <p className="text-gray-500">{profile?.role || "Administrator"}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <div className="flex items-center border rounded-md px-3 py-2 bg-gray-50">
                    <User className="h-4 w-4 text-gray-500 mr-2" />
                    <span>{profile?.name || "Admin User"}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="flex items-center border rounded-md px-3 py-2 bg-gray-50">
                    <Mail className="h-4 w-4 text-gray-500 mr-2" />
                    <span>{profile?.email || "admin@example.com"}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Password</Label>
                <div className="flex items-center border rounded-md px-3 py-2 bg-gray-50">
                  <Key className="h-4 w-4 text-gray-500 mr-2" />
                  <span>••••••••</span>
                </div>
              </div>

              <Button onClick={handleResetPassword}>Reset Password</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admin">
          <Card>
            <CardHeader>
              <CardTitle>Admin Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
                <DialogTrigger asChild>
                  <Button>Add Admin User</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Admin User</DialogTitle>
                    <DialogDescription>
                      Create a new administrator account with full access to the admin dashboard.
                    </DialogDescription>
                  </DialogHeader>

                  {error && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {success && (
                    <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
                      <AlertDescription>{success}</AlertDescription>
                    </Alert>
                  )}

                  <form onSubmit={handleAddUser} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={newUserData.name}
                        onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newUserData.email}
                        onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={newUserData.password}
                        onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                        required
                      />
                    </div>

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsAddUserDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          "Add User"
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
