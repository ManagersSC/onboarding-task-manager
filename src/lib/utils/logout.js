let logoutTimeout;

export async function handleLogout(router) {
  // Clear any existing timeout
  if (logoutTimeout) {
    clearTimeout(logoutTimeout);
  }
  
  // Set a new timeout
  logoutTimeout = setTimeout(async () => {
    try {
      const response = await fetch("/api/logout", { method: "POST" });
      if (!response.ok) throw new Error("Failed to logout");
      router.replace("/");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  }, 300); // 300ms debounce
} 