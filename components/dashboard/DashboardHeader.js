"use client"

import { useCallback } from "react";
import { motion } from "framer-motion";
import { Bell } from 'lucide-react';
import { useRouter } from "next/navigation";
import { handleLogout } from "@/lib/utils/logout";
import { formatDistanceToNow } from "date-fns";
import useNotifications from "@/hooks/useNotifications";

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
  const {
    notifications,
    loading,
    unreadCount,
    markAsRead,
  } = useNotifications({ limit: 3 });

  const navigateToProfile = () => {
    router.push("/admin/profile");
  };

  const navigateToSettings = () => {
    router.push("/admin/settings");
  };

  const handleNotificationClick = useCallback(
    async (notification) => {
      if (!notification.read) await markAsRead(notification.id);
      if (notification.actionUrl) router.push(notification.actionUrl);
    },
    [markAsRead, router]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex items-center justify-end gap-4"
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                {unreadCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {loading ? (
            <DropdownMenuItem>
              <div className="flex flex-col gap-1 animate-pulse w-full">
                <div className="h-4 bg-muted rounded w-2/3 mb-1" />
                <div className="h-3 bg-muted rounded w-1/3" />
              </div>
            </DropdownMenuItem>
          ) : notifications.length === 0 ? (
            <DropdownMenuItem disabled>
              <div className="text-muted-foreground text-center w-full">No notifications</div>
            </DropdownMenuItem>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="cursor-pointer"
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium line-clamp-1">{notification.title || notification.body}</p>
                  <p className="text-xs text-muted-foreground">
                    {notification.source ? `${notification.source} - ` : ""}
                    {notification.createdAt ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true }) : ""}
                  </p>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src="/file.svg" alt="User" />
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={navigateToProfile} className="cursor-pointer">
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={navigateToSettings} className="cursor-pointer">
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleLogout(router)} className="cursor-pointer">
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );
}