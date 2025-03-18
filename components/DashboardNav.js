"use client"

import { useState, useEffect } from "react"
import { User, LogOut } from "lucide-react"
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

export function DashboardNav() {
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)
    const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false)
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(false)
    const [isAuthenticated, setIsAuthenticated] = useState(false)

    // Check auth status on mount
    useEffect(() => {
        const checkAuthStatus = async () => {
            try {
                const response = await fetch("/api/status");
                if (!response.ok) throw new Error("Auth check failed");
                const { isAuthenticated } = await response.json();
                setIsAuthenticated(isAuthenticated);
            } catch(error){
                console.error("Auth check error: ", error.message);
            }
        }
        checkAuthStatus();
    }, []);

    const fetchProfile = async () => {
        if(profile) return;
        setLoading(true);
        try {
            const response = await fetch("/api/user");
            if (!response.ok) throw new Error("Failed to fetch profile");
            const data = await response.json();
        setProfile(data);
        } catch (error) {
            console.error("Error fetching profile:", error)
        } finally {
            setLoading(false)
        }
    }
    
    useEffect(() => {
        if (isOpen) {
            fetchProfile()
        }
    }, [isOpen])

    const handleLogout = async () => {
        try {
            const response = await fetch("/api/logout", { method: "POST" });
            if (!response.ok) throw new Error("Failed to logout");
            setProfile(null);
            router.push("/")
        } catch (error) {
            console.error("Error logging out:", error)
        }
    }

    const handleResetPassword = () => {
        router.push("/forgot-password")
    }

    return (
    <nav className="border-b bg-background">
        <div className="container mx-auto px-4 flex h-16 items-center">
            <div className="mr-4 hidden md:flex">
                <h2 className="text-lg font-semibold">Task Management</h2>
            </div>
            {isAuthenticated && (
                <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
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
                </div>
            )}
        </div>

        {/* Profile */}
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
                    <AvatarFallback>{profile.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                    <h4 className="text-sm font-semibold">{profile.name}</h4>
                    <p className="text-sm text-muted-foreground">{profile.job}</p>
                    <p className="text-sm text-muted-foreground">{profile.email}</p>
                    </div>
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
    </nav>
    )
}

