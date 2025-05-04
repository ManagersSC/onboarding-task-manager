// src/middleware.js
import { NextResponse } from "next/server";
import { unsealData } from "iron-session";
import { rateLimiter } from '@/lib/rateLimiter';
import { edgeLog } from "./lib/utils/edgeLogger";

// Strict: 5 req/min, Relaxed: 60 req/min
const strictLimiter = rateLimiter(5, 60 * 1000);
const relaxedLimiter = rateLimiter(60, 60 * 1000);

export async function middleware(request) {
  // Debug: Log every request to middleware
  edgeLog('[MIDDLEWARE] Path:', request.nextUrl.pathname);

  const path = request.nextUrl.pathname;

  // Strict rate limit for sensitive endpoints
  if (
    path === '/api/login' ||
    path === '/api/admin/login' ||
    path === '/api/sign-up' ||
    path === '/api/forgot-password' ||
    path === '/api/reset-password' ||
    path === '/api/logout' ||
    path === '/api/admin/create-admin'
  ) {
    const response = strictLimiter(request);
    if (response) {
      edgeLog('[MIDDLEWARE] Rate limit triggered for:', path);
      return response;
    } else {
      edgeLog('[MIDDLEWARE] Rate limit NOT triggered for:', path);
    }
  } else {
    // Relaxed rate limit for all other API endpoints
    const response = relaxedLimiter(request);
    if (response) {
      edgeLog('[MIDDLEWARE] Rate limit triggered for:', path);
      return response;
    } else {
      edgeLog('[MIDDLEWARE] Rate limit NOT triggered for:', path);
    }
  }

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
  matcher: ['/api/:path*'],
}