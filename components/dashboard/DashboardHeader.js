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
      className="flex items-center gap-3"
    >
      {/* Theme toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-lg"
        onClick={toggleTheme}
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/40 transition-colors">
            <Avatar className="h-8 w-8 rounded-full">
              <AvatarImage src="/file.svg" alt="User" />
              <AvatarFallback className="bg-primary/10 text-primary font-medium text-caption">JD</AvatarFallback>
            </Avatar>
            <span className="text-body-sm font-medium">John Doe</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="shadow-elevated-lg rounded-xl border border-border/40 p-1 min-w-[200px] animate-scale-in">
          <DropdownMenuLabel className="px-3 py-2">
            <p className="text-body-sm font-semibold">My Account</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={navigateToProfile} className="rounded-lg cursor-pointer gap-2.5 px-3 py-2 text-body-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={navigateToSettings} className="rounded-lg cursor-pointer gap-2.5 px-3 py-2 text-body-sm">
            <Settings className="h-4 w-4 text-muted-foreground" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => handleLogout(router)}
            className="rounded-lg cursor-pointer gap-2.5 px-3 py-2 text-body-sm text-error hover:bg-error/5 focus:text-error focus:bg-error/5"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );
}
