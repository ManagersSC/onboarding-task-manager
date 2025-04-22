// src/middleware.js
import { NextResponse } from "next/server";
import { unsealData } from "iron-session";

export async function middleware(request) {
  const path = request.nextUrl.pathname
  const isPublic = ["/", "/signup", "forgot-password"].includes(path);
  const isAdminRoute = path.startsWith("/admin")

  // Check session cookie
  const sessionCookie = request.cookies.get("session")?.value;
  if(!isPublic && !sessionCookie){
    return NextResponse.redirect(new URL("/", request.nextUrl));
  }

  // Unseal session to check for role
  let session;
  try{
    session = await unsealData(sessionCookie, {
      password: process.env.SESSION_SECRET,
      ttl: 60 * 60 * 8
    })
  } catch (error){
    return NextResponse.redirect(new URL("/", request.nextUrl));
  }

  // Check admin access
  if (isAdminRoute && session.userRole !== "admin") {
    return NextResponse.redirect(new URL("/?mode=admin", request.nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/api/get-tasks", "/api/complete-task", "/api/admin/:path*"],
}
