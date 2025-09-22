// src/middleware.js
import { NextResponse } from "next/server";
import { unsealData } from "iron-session";
import { rateLimiter } from '@/lib/rateLimiter';
import { edgeLog } from "./lib/utils/edgeLogger";

// Internal app rate limits: 30 req/min for sensitive endpoints, 300 req/min for others
const strictLimiter = rateLimiter(30, 60 * 1000);  // 30 requests per minute
const relaxedLimiter = rateLimiter(300, 60 * 1000); // 300 requests per minute

// List of sensitive endpoints that need stricter rate limiting
const STRICT_RATE_LIMIT_PATHS = [
  '/api/login',
  '/api/admin/login',
  '/api/sign-up',
  '/api/forgot-password',
  '/api/reset-password',
  '/api/admin/create-admin'
];

export async function middleware(request) {
  const path = request.nextUrl.pathname;
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';

  // Debug: Log every request to middleware
  edgeLog('[MIDDLEWARE] Request:', {
    path,
    ip,
    method: request.method
  });

  // Apply rate limiting based on endpoint type
  if (STRICT_RATE_LIMIT_PATHS.includes(path)) {
    edgeLog('[MIDDLEWARE] Applying strict rate limit to:', path);
    const response = strictLimiter(request);
    if (response) {
      edgeLog('[MIDDLEWARE] Rate limit triggered for:', path);
      return response;
    }
  } else if (path.startsWith('/api/')) {
    edgeLog('[MIDDLEWARE] Applying relaxed rate limit to:', path);
    const response = relaxedLimiter(request);
    if (response) {
      edgeLog('[MIDDLEWARE] Rate limit triggered for:', path);
      return response;
    }
  }

  const isPublic = ["/", "/signup", "/forgot-password", "/accept-admin-invite"].includes(path);
  const isAdminRoute = path.startsWith("/admin");

  // Check session cookie
  const sessionCookie = request.cookies.get("session")?.value;
  if(!isPublic && !sessionCookie){
    edgeLog('[MIDDLEWARE] No session cookie, redirecting to home');
    return NextResponse.redirect(new URL("/", request.nextUrl));
  }

  // Unseal session to check for role
  let session;
  try{
    session = await unsealData(sessionCookie, {
      password: process.env.SESSION_SECRET,
      ttl: 60 * 60 * 8
    });
    edgeLog('[MIDDLEWARE] Session validated for:', session.userEmail);
  } catch (error){
    edgeLog('[MIDDLEWARE] Invalid session:', error.message);
    return NextResponse.redirect(new URL("/", request.nextUrl));
  }

  // Check admin access
  if (isAdminRoute && session.userRole !== "admin") {
    edgeLog('[MIDDLEWARE] Non-admin access attempt to admin route:', path);
    return NextResponse.redirect(new URL("/?mode=admin", request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
    '/admin/:path*',
    '/dashboard/:path*'
  ]
}