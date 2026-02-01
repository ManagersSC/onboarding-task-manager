"use client"

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { handleLogout } from "@/lib/utils/logout";
import { Sun, Moon, User, LogOut, Settings, ChevronDown } from "lucide-react";

import { Button } from "@components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@components/ui/avatar";

export function DashboardHeader() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    document.documentElement.classList.toggle("dark", newTheme);
    localStorage.setItem("theme", newTheme ? "dark" : "light");
  };

  const navigateToProfile = () => {
    router.push("/admin/profile");
  };

  const navigateToSettings = () => {
    router.push("/admin/settings");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex items-center justify-end gap-2"
    >
      {/* Theme toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full h-9 w-9 transition-all duration-base hover:bg-muted"
        onClick={toggleTheme}
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 rounded-full px-2 gap-2 transition-all duration-base hover:bg-muted group">
            <Avatar className="h-8 w-8 ring-2 ring-transparent group-hover:ring-primary/20 transition-all duration-base">
              <AvatarImage src="/file.svg" alt="User" />
              <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">JD</AvatarFallback>
            </Avatar>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-base group-data-[state=open]:rotate-180" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 shadow-elevated-lg animate-scale-in p-1">
          <DropdownMenuLabel className="px-3 py-2">
            <p className="text-sm font-semibold">My Account</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="mx-1" />
          <DropdownMenuItem onClick={navigateToProfile} className="mx-1 rounded-md cursor-pointer gap-2.5 py-2">
            <User className="h-4 w-4 text-muted-foreground" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={navigateToSettings} className="mx-1 rounded-md cursor-pointer gap-2.5 py-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator className="mx-1" />
          <DropdownMenuItem
            onClick={() => handleLogout(router)}
            className="mx-1 rounded-md cursor-pointer gap-2.5 py-2 text-error focus:text-error focus:bg-error/10"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );
}