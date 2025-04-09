// src/middleware.js
import { NextResponse } from "next/server"

export function middleware(request) {
  const path = request.nextUrl.pathname
  const isPublic = path === "/login" || path === "/signup" || path === "/forgot-password"
  const isAdminRoute = path.startsWith("/admin")

  const token = request.cookies.get("user_email")?.value
  const role = request.cookies.get("user_role")?.value

  // Redirect to login if not authenticated
  if (!isPublic && !token) {
    return NextResponse.redirect(new URL("/login", request.nextUrl))
  }

  // Check admin access
  if (isAdminRoute && role !== "admin") {
    return NextResponse.redirect(new URL("/login?mode=admin", request.nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/api/get-tasks", "/api/complete-task", "/api/admin/:path*"],
}
