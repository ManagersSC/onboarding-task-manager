"use client";
import { Toaster } from "sonner";
import { useTheme } from "@components/theme-provider";

export default function AppToaster() {
  const { theme } = useTheme();
  return <Toaster theme={theme === "system" ? undefined : theme} />;
} 