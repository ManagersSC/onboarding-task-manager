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
  // VULN-H8: Use non-spoofable IP source
  const realIp = request.headers.get('x-real-ip');
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = realIp || (forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1');

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

  // VULN-M2: CSRF protection — verify same-origin requests using Sec-Fetch headers
  // Browsers automatically set Sec-Fetch-Site on all requests; this blocks cross-origin form submissions
  if (path.startsWith('/api/') && request.method !== 'GET' && request.method !== 'OPTIONS') {
    const secFetchSite = request.headers.get('sec-fetch-site');
    // Allow same-origin and same-site; block cross-site and none (direct navigation)
    // Also allow requests with no sec-fetch-site (non-browser clients like Make.com webhooks)
    if (secFetchSite && secFetchSite !== 'same-origin' && secFetchSite !== 'same-site') {
      edgeLog('[MIDDLEWARE] CSRF validation failed for:', path);
      return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
    }
  }

  const isPublicPage = ["/", "/signup", "/forgot-password", "/accept-admin-invite"].includes(path);
  const isPublicApi = [
    "/api/login", "/api/admin/login", "/api/sign-up",
    "/api/forgot-password", "/api/reset-password", "/api/admin/accept-invite",
  ].includes(path);
  const isPublic = isPublicPage || isPublicApi;
  const isAdminRoute = path.startsWith("/admin");
  const isAdminApiRoute = path.startsWith("/api/admin");
  const adminApiExemptions = ['/api/admin/login', '/api/admin/accept-invite'];
  const needsAdminRole = isAdminRoute || (isAdminApiRoute && !adminApiExemptions.includes(path));

  // Allow public routes through without session check
  if (isPublic) {
    return NextResponse.next();
  }

  // Check session cookie
  const sessionCookie = request.cookies.get("session")?.value;
  if(!sessionCookie){
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
    // VULN-L2: Don't log PII (email) in production
    edgeLog('[MIDDLEWARE] Session validated, role:', session.userRole);
  } catch (error){
    edgeLog('[MIDDLEWARE] Invalid session:', error.message);
    return NextResponse.redirect(new URL("/", request.nextUrl));
  }

  // Check admin access
  if (needsAdminRole && session.userRole !== "admin") {
    edgeLog('[MIDDLEWARE] Non-admin access attempt to admin route:', path);
    if (isAdminApiRoute) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
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