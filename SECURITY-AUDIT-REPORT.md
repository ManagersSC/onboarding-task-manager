# Security Audit Report — Smile Cliniq Onboarding Task Manager

**Date:** 2026-02-16
**Scope:** Full codebase security audit (70+ API routes, middleware, client components, configuration)
**Framework:** Next.js 15 (App Router) + Airtable backend
**Branch:** `feature/init_claude_code`

---

## Executive Summary

This audit identified **43 security vulnerabilities** across the application:

| Severity | Count |
|----------|-------|
| **Critical** | 7 |
| **High** | 14 |
| **Medium** | 15 |
| **Low** | 7 |

The most urgent issues are:
1. **Complete authentication bypass** — the rate limiter's return value causes middleware to skip all auth checks on every API route
2. **Unauthenticated admin creation** — the authorization check in `create-admin` is commented out
3. **SSRF in file proxy** — any URL can be fetched with the server's Airtable API key
4. **Airtable formula injection** — unsanitized user input in 10+ query locations
5. **Missing admin role enforcement** — middleware doesn't check roles on `/api/admin/*` routes

**If only 3 things are fixed immediately:** Fix the rate limiter return value (VULN-C1), uncomment the admin creation auth check (VULN-C2), and add admin role enforcement to `/api/admin/*` in middleware (VULN-C5).

---

## Critical Issues (Fix Immediately)

---

### VULN-C1: Rate Limiter Causes Complete Authentication Bypass on ALL API Routes

**Severity:** CRITICAL
**Files:** `src/lib/rateLimiter.js:67-73`, `src/middleware.js:33-47`

**The Problem:**
The rate limiter returns `NextResponse.next()` for non-rate-limited requests. This is a **truthy** value. The middleware checks `if (response)` and returns early — **skipping all session validation and admin role checks**.

```javascript
// rateLimiter.js — returns truthy NextResponse.next() when NOT rate-limited
return NextResponse.next({
  headers: {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': (limit - validTimestamps.length).toString(),
    'X-RateLimit-Reset': (now + windowMs).toString()
  }
});

// middleware.js — checks if (response) which is ALWAYS true
if (STRICT_RATE_LIMIT_PATHS.includes(path)) {
    const response = strictLimiter(request);
    if (response) {       // ← ALWAYS true! NextResponse.next() is truthy
      return response;    // ← Returns early, SKIPS all auth checks below
    }
} else if (path.startsWith('/api/')) {
    const response = relaxedLimiter(request);
    if (response) {       // ← ALWAYS true
      return response;    // ← Returns early, SKIPS all auth checks below
    }
}
```

**Impact:** Every `/api/*` endpoint is effectively **unauthenticated**. Any anonymous user can call any API endpoint.

**Fix in `src/lib/rateLimiter.js`** — return `null` when request should proceed:
```javascript
if (validTimestamps.length >= limit) {
  // ... return 429 response (keep existing code)
}

validTimestamps.push(now);
rateLimitStore.set(ip, validTimestamps);

// Return null to indicate request should proceed through middleware
return null;
```

---

### VULN-C2: Admin Creation Auth Check Commented Out

**Severity:** CRITICAL
**File:** `src/app/api/admin/create-admin/route.js:11-16`

```javascript
const cookieStore = await cookies()
const role = cookieStore.get("user_role")?.value  // Also uses wrong cookie pattern
const adminEmail = cookieStore.get("user_email")?.value

// if (role !== "admin") {
//   return Response.json({ error: "Unauthorized" }, { status: 401 })
// }
```

**Impact:** Any user (or anonymous user, due to VULN-C1) can create admin accounts.

**Fix:**
```javascript
import { unsealData } from "iron-session"

const cookieStore = await cookies()
const sessionCookie = cookieStore.get("session")?.value
if (!sessionCookie) {
  return Response.json({ error: "Unauthorized" }, { status: 401 })
}

const session = await unsealData(sessionCookie, {
  password: process.env.SESSION_SECRET,
  ttl: 60 * 60 * 8,
})

if (session.userRole !== "admin") {
  return Response.json({ error: "Forbidden" }, { status: 403 })
}
```

---

### VULN-C3: SSRF (Server-Side Request Forgery) in File Proxy

**Severity:** CRITICAL
**File:** `src/app/api/admin/files/proxy/route.js:8,33`

```javascript
const fileUrl = searchParams.get('url')  // User-controlled URL

const response = await fetch(fileUrl, {   // Fetches ANY URL
  headers: {
    'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,  // Sends API key!
  }
})
```

**Impact:** An attacker can:
- Access internal network services (`http://169.254.169.254/` for cloud metadata)
- Exfiltrate the Airtable API key to an attacker-controlled server
- Port-scan the internal network

**Fix:**
```javascript
const ALLOWED_HOSTS = ['dl.airtable.com', 'v5.airtableusercontent.com']

let parsedUrl
try {
  parsedUrl = new URL(fileUrl)
} catch {
  return new Response(JSON.stringify({ error: "Invalid URL" }), { status: 400 })
}

if (parsedUrl.protocol !== 'https:') {
  return new Response(JSON.stringify({ error: "Only HTTPS allowed" }), { status: 400 })
}

if (!ALLOWED_HOSTS.includes(parsedUrl.hostname)) {
  return new Response(JSON.stringify({ error: "URL not allowed" }), { status: 403 })
}

const response = await fetch(fileUrl, {
  headers: { 'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}` },
  redirect: 'error',  // Prevent redirect-based bypasses
})
```

---

### VULN-C4: Airtable Formula Injection (10+ Files)

**Severity:** CRITICAL
**Affected Files:**
- `src/app/api/login/route.js:51`
- `src/app/api/sign-up/route.js:46`
- `src/app/api/forgot-password/route.js:25`
- `src/app/api/reset-password/route.js:50`
- `src/app/api/user/route.js:48`
- `src/app/api/admin/create-admin/route.js:34`
- `src/app/api/complete-task/route.js:75`
- `src/app/api/quizzes/[quizId]/submission/route.js:15,34,82`
- `src/app/api/admin/users/[id]/route.js:578,636,659`
- `src/app/api/dashboard/tasks/route.js:48-54,122`
- `src/app/api/admin/audit-logs/export/route.js:63-82`

```javascript
// Representative example — user email injected directly into formula
filterByFormula: `{Email}='${normalisedEmail}'`
```

**Impact:** An email like `test'&1=1),'` manipulates the Airtable formula, potentially bypassing authentication or extracting data.

**Fix — create `src/lib/airtable/sanitize.js`:**
```javascript
export function escapeAirtableValue(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
```

Then apply everywhere:
```javascript
import { escapeAirtableValue } from '@/lib/airtable/sanitize';
filterByFormula: `{Email}='${escapeAirtableValue(normalisedEmail)}'`
```

---

### VULN-C5: Middleware Does Not Enforce Admin Role on `/api/admin/*` Routes

**Severity:** CRITICAL
**File:** `src/middleware.js:50,72-76`

```javascript
const isAdminRoute = path.startsWith("/admin");  // Only page routes, NOT /api/admin/*

if (isAdminRoute && session.userRole !== "admin") {
    return NextResponse.redirect(new URL("/?mode=admin", request.nextUrl));
}
```

**Impact:** Any authenticated user (team member, clinic manager) can call any `/api/admin/*` endpoint — bulk delete users, send emails, manage quizzes, export audit logs, etc.

**Fix:**
```javascript
const isAdminRoute = path.startsWith("/admin");
const isAdminApiRoute = path.startsWith("/api/admin");
const adminApiExemptions = ['/api/admin/login', '/api/admin/accept-invite'];
const needsAdminRole = isAdminRoute || (isAdminApiRoute && !adminApiExemptions.includes(path));

if (needsAdminRole && session.userRole !== "admin") {
    if (isAdminApiRoute) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/?mode=admin", request.nextUrl));
}
```

---

### VULN-C6: No Authentication on Email Sending Endpoint

**Severity:** CRITICAL
**File:** `src/app/api/admin/send-email/route.js:4-14`

```javascript
export async function POST(request) {
  try {
    const { recipients, email } = await request.json()
    // No session check, no role check — sends emails immediately
```

**Impact:** Combined with VULN-C1 and VULN-C5, anyone can send arbitrary emails via the Make.com webhook to any recipient, enabling phishing attacks from the clinic's domain.

**Fix:** Add session validation and admin role check at the start of the handler (see VULN-C2 pattern).

---

### VULN-C7: CORS Wildcard with Credentials

**Severity:** CRITICAL
**File:** `next.config.mjs:28-29`

```javascript
{ key: "Access-Control-Allow-Credentials", value: "true" },
{ key: "Access-Control-Allow-Origin", value: "*" },
```

**Impact:** While browsers block this specific combination, the intent is dangerous and some HTTP clients/older browsers may not enforce the spec.

**Fix:** Replace `*` with your actual domain:
```javascript
{ key: "Access-Control-Allow-Origin", value: "https://your-domain.com" },
```

---

## High Priority Issues

---

### VULN-H1: Auth API Routes Missing from Public Exemptions

**File:** `src/middleware.js:49`

```javascript
const isPublic = ["/", "/signup", "/forgot-password", "/accept-admin-invite"].includes(path);
```

Auth endpoints (`/api/login`, `/api/sign-up`, `/api/forgot-password`, etc.) are not listed as public. Currently masked by VULN-C1, but once that's fixed, **login will break**.

**Fix:**
```javascript
const isPublicApi = [
  "/api/login", "/api/admin/login", "/api/sign-up",
  "/api/forgot-password", "/api/reset-password", "/api/admin/accept-invite",
].includes(path);
const isPublic = isPublicPage || isPublicApi;
```

---

### VULN-H2: IDOR — Any User Can Complete Any Task

**File:** `src/app/api/complete-task/route.js:53,111-116`

The endpoint never verifies the supplied `taskId` belongs to the authenticated user.

**Fix:** After fetching the task record, verify ownership:
```javascript
const taskAssigned = taskLogRecord.fields["Assigned"] || [];
if (!taskAssigned.includes(applicantRecord.id)) {
  return Response.json({ error: "This task is not assigned to you." }, { status: 403 });
}
```

---

### VULN-H3: Silent Auth Failure in Dashboard Tasks PATCH/DELETE + Missing Auth in GET

**File:** `src/app/api/dashboard/tasks/[id]/route.js:14-25,350-379`

PATCH/DELETE silently continue with "Unknown" user on auth failure. GET has no auth at all.

**Fix:** Make authentication mandatory — return 401 on failure instead of empty catch.

---

### VULN-H4: No Ownership Check on Dashboard Task Operations

**File:** `src/app/api/dashboard/tasks/[id]/route.js:31-301`

All actions (complete, edit, flag, claim, delete) operate on any task ID without verifying the user is assigned.

**Fix:** Verify task assignment before allowing operations; only admins can delete.

---

### VULN-H5: No Password Complexity on Sign-up and Reset

**Files:** `src/app/api/sign-up/route.js:70`, `src/app/api/reset-password/route.js:57`

`accept-invite` enforces 8+ chars, special character, no sequential numbers — but sign-up and reset-password accept any password.

**Fix:** Create shared `src/lib/validation/password.js` and enforce consistently everywhere.

---

### VULN-H6: Reset Token Not Invalidated After Use (1-Hour Replay)

**File:** `src/app/api/reset-password/route.js:38-42`

JWT reset token remains valid for 1 hour after use. Anyone who intercepts it can reset the password again.

**Fix:** Store a `ResetNonce` in Airtable, include in JWT, verify + clear on use.

---

### VULN-H7: Admin Invite Token Replay (24-Hour Window)

**File:** `src/app/api/admin/accept-invite/route.js:58-59`

Invite token check relies only on whether a password exists, not cryptographic invalidation.

**Fix:** Store invite nonce, include in JWT, verify + clear on acceptance.

---

### VULN-H8: Rate Limiter Trusts Spoofable `x-forwarded-for`

**Files:** `src/lib/rateLimiter.js:15`, `src/middleware.js:23`

```javascript
const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
```

**Fix:** Use `x-real-ip` (Vercel-provided, non-spoofable) and take only the first IP from forwarded-for.

---

### VULN-H9: No File Size Limits on Upload Endpoints

**Files:** `src/app/api/admin/users/upload-document/route.js:65-70`, 3 other upload routes

Files are read entirely into memory with no size check. A 100MB file = ~133MB RAM (base64).

**Fix:** Add `MAX_FILE_SIZE = 10 * 1024 * 1024` check before processing.

---

### VULN-H10: No File Type Validation on Uploads

**Same files as VULN-H9**

No MIME type or extension validation. `.exe`, `.html`, `.svg` (with JS) can all be uploaded.

**Fix:** Allowlist safe MIME types and block dangerous extensions.

---

### VULN-H11: No Bulk Delete Size Limits

**Files:** `src/app/api/admin/users/bulk-delete/route.js:49`, `src/app/api/admin/tasks/bulk-delete/route.js:49`

No upper bound on array size — could delete entire database in one call.

**Fix:** Add `MAX_BULK_DELETE = 50` and validate array elements against Airtable ID format (`/^rec[a-zA-Z0-9]{14}$/`).

---

### VULN-H12: XSS via `dangerouslySetInnerHTML` (12 Instances)

**Files:**
- `components/quiz/question-item.jsx:66,95,126`
- `components/quiz/info-item.jsx:12`
- `components/quiz/preview-renderer.jsx:23,30,35,44,49`
- `src/app/admin/quizzes/page.js:994,1016`

Quiz content from Airtable is rendered without sanitization.

**Fix:** Install `dompurify`, create `src/lib/utils/sanitize.js`, and sanitize all HTML before rendering.

---

### VULN-H13: Debug Data Leaked in Production Responses

**File:** `src/app/api/admin/users/[id]/route.js:693-700`

```javascript
debug: { availableFields, cvFieldType, cvFieldValue, ... }  // Always included!
```

**Fix:** Gate behind `process.env.NODE_ENV === "development"`.

---

### VULN-H14: Google Refresh Token Logged to Console

**File:** `src/get-google-refresh.js:33`

```javascript
console.log('Your refresh token:', token.refresh_token);
```

**Fix:** Write to a file instead, or prompt user to copy from secure display.

---

## Medium Priority Issues

---

### VULN-M1: Missing Global Security Headers

**File:** `next.config.mjs:23-35`

No HSTS, X-Frame-Options, X-Content-Type-Options, CSP, Referrer-Policy, or Permissions-Policy headers.

**Fix:** Add global header block to `next.config.mjs`:
```javascript
{
  source: "/:path*",
  headers: [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' https://v5.airtableusercontent.com https://dl.airtable.com data:; frame-ancestors 'none';" },
  ],
},
```

---

### VULN-M2: No CSRF Protection

No CSRF tokens anywhere. Relies solely on `SameSite=Lax` cookies.

**Fix:** Require `X-Requested-With: XMLHttpRequest` header on all non-GET API requests in middleware:
```javascript
if (path.startsWith('/api/') && request.method !== 'GET') {
  if (request.headers.get('X-Requested-With') !== 'XMLHttpRequest') {
    return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 })
  }
}
```

---

### VULN-M3: Missing `sameSite` Cookie in Attachments Route

**File:** `src/app/api/admin/tasks/core-tasks/[id]/attachments/route.js:177-184`

Only route missing `sameSite: 'lax'` on cookie set.

---

### VULN-M4: In-Memory Rate Limiting Ineffective in Serverless

**File:** `src/lib/rateLimiter.js:4`

Each serverless instance has its own empty `Map`. Use Upstash Redis or Vercel KV instead.

---

### VULN-M5: Account Enumeration via Differential Error Messages

**Files:** `src/app/api/login/route.js:56-63,82-88`, `src/app/api/sign-up/route.js:50-54,59-66`

Different messages for "user not found" vs "wrong password". Use identical messages.

---

### VULN-M6: Timing Attack on Login

**File:** `src/app/api/login/route.js:70-78`

Returns immediately when user has no password (skips bcrypt). Compare against a dummy hash.

---

### VULN-M7: Reset Token Sent to Wrong Webhook

**File:** `src/app/api/forgot-password/route.js:48,62`

Validates `MAKE_WEBHOOK_URL_RESET_PASSWORD` but sends to `MAKE_WEBHOOK_URL`.

---

### VULN-M8: Error Messages Leak Internal Details in Production

**Files:** Multiple API routes return `error.message` unconditionally.

**Fix:** Gate `details` behind `NODE_ENV === "development"`.

---

### VULN-M9: Test Endpoints Accessible in Production

**Files:**
- `src/app/api/admin/users/bulk-delete/test/route.js`
- `src/app/api/admin/tasks/bulk-delete/test/route.js`
- `src/app/api/admin/tasks/bulk-create/test/route.js`
- `src/app/api/admin/users/test/route.js`

**Fix:** Delete or gate behind `NODE_ENV !== "production"`.

---

### VULN-M10: Admin Layout Lacks Defense-in-Depth Auth

**File:** `src/app/admin/layout.js`

No server-side session check. Relies entirely on middleware.

---

### VULN-M11: User-Controlled Airtable Field Name in Uploads

**Files:** `src/app/api/admin/users/upload-document/route.js:30-31`, 2 other upload routes

The `field` parameter can write to any Airtable field (Email, Stage, etc.).

**Fix:** Allowlist valid upload field names.

---

### VULN-M12: Mass Assignment in Dashboard Task Creation

**File:** `src/app/api/dashboard/tasks/route.js:224-254`

No Zod validation. `createdById` accepted from request body (impersonation).

---

### VULN-M13: CSV Injection in Audit Log Export

**File:** `src/app/api/admin/audit-logs/export/route.js:193-204`

Values starting with `=`, `+`, `-`, `@` executed as formulas in Excel.

**Fix:** Prefix dangerous characters with `'`.

---

### VULN-M14: ESLint Disabled During Builds

**File:** `next.config.mjs:3-5`

`ignoreDuringBuilds: true` allows insecure code to ship.

---

### VULN-M15: No Client-Side File Type Validation

**Files:** `components/admin/users/upload-dropzone.js:69`, `components/admin/users/admin-document-upload.js:173-180`

No `accept` attribute, no JS validation of file type/size.

---

## Low Priority Issues

---

### VULN-L1: Debug Endpoints Leak Internal Data

**Files:** `src/app/api/admin/users/[id]/debug-feedback/route.js`, `src/app/api/admin/users/[id]/debug-documents/route.js`

### VULN-L2: PII (Emails) Logged in Debug/Edge Logs

**Files:** `src/app/api/admin/login/route.js:98`, `src/middleware.js:66`

### VULN-L3: `console.log` Used Instead of Structured Logger

**Files:** Multiple API routes use `console.log` with sensitive data.

### VULN-L4: Host Header Injection in Invite Link

**File:** `src/app/api/admin/invite-admin/route.js:93-97`

Falls back to spoofable `Host` header when `APP_BASE_URL` not set.

### VULN-L5: Error Variable Scoping Bug

**File:** `src/app/api/forgot-password/route.js:84`

Catches `err` but logs `error` (undefined).

### VULN-L6: Unused `next-auth` Dependency

**File:** `package.json:50`

Increases attack surface. Remove if not used.

### VULN-L7: `params` Not Awaited (Next.js 15 Async Params)

**Files:** `src/app/api/admin/dashboard/new-hires/[id]/start-onboarding/route.js:91`, `src/app/api/admin/email-templates/[id]/route.js:135`

---

## Prioritized Action Plan

### Week 1 — Emergency Fixes (Critical)

| Priority | Vuln | Action | Effort |
|----------|------|--------|--------|
| 1 | C1 | Fix rate limiter to return `null` instead of `NextResponse.next()` | 5 min |
| 2 | C5 | Add admin role enforcement for `/api/admin/*` in middleware | 15 min |
| 3 | C2 | Uncomment + fix admin creation auth check with iron-session | 10 min |
| 4 | H1 | Add auth API routes to public exemptions in middleware | 5 min |
| 5 | C3 | Add URL allowlist to file proxy | 15 min |
| 6 | C6 | Add authentication to send-email endpoint | 10 min |
| 7 | C4 | Create Airtable formula sanitizer, apply to all 10+ files | 30 min |
| 8 | C7 | Replace CORS wildcard with actual domain | 5 min |

### Week 2 — High Priority

| Priority | Vuln | Action | Effort |
|----------|------|--------|--------|
| 9 | H2,H3,H4 | Fix IDOR and auth in task endpoints | 1 hr |
| 10 | H9,H10 | Add file size + type validation to uploads | 30 min |
| 11 | H5 | Create shared password validation, apply to sign-up + reset | 20 min |
| 12 | H6,H7 | Implement one-time-use tokens (nonce pattern) | 1 hr |
| 13 | H11 | Add max array size to bulk deletes | 10 min |
| 14 | H12 | Install DOMPurify, sanitize all dangerouslySetInnerHTML | 30 min |
| 15 | H13 | Gate debug data behind NODE_ENV | 5 min |
| 16 | M1 | Add global security headers | 15 min |

### Week 3 — Medium Priority

| Priority | Vuln | Action | Effort |
|----------|------|--------|--------|
| 17 | M2 | Implement CSRF header validation | 30 min |
| 18 | M4 | Migrate rate limiting to Redis/Upstash | 2 hr |
| 19 | M8 | Sanitize all error responses for production | 1 hr |
| 20 | M9 | Remove or gate test endpoints | 15 min |
| 21 | M11,M12 | Add field allowlists and Zod validation | 1 hr |
| 22 | M5,M6 | Fix account enumeration and timing attacks | 30 min |
| 23 | M13 | Fix CSV injection in audit export | 10 min |

### Backlog — Low Priority

Findings L1-L7: Debug cleanup, logging hygiene, unused dependencies.

---

## Recommended Security Packages

| Package | Purpose | Install |
|---------|---------|---------|
| `dompurify` | Sanitize HTML to prevent XSS | `npm i dompurify` |
| `@upstash/ratelimit` | Distributed rate limiting for serverless | `npm i @upstash/ratelimit @upstash/redis` |
| `helmet` | Security headers (alternative to manual config) | `npm i helmet` |
| `zod` | Already installed — extend usage to all API inputs | — |

---

## Security Best Practices Checklist

- [ ] All API routes validate session and check roles
- [ ] All user input sanitized before Airtable formula interpolation
- [ ] All file uploads validated (type, size, count)
- [ ] All error responses redacted in production
- [ ] All `dangerouslySetInnerHTML` uses DOMPurify
- [ ] Security headers set globally (HSTS, CSP, X-Frame-Options, etc.)
- [ ] CORS restricted to actual domain(s)
- [ ] CSRF protection via custom header or token
- [ ] Rate limiting uses distributed store (Redis)
- [ ] Rate limiter uses non-spoofable IP source
- [ ] Password complexity enforced consistently
- [ ] Reset/invite tokens are single-use (nonce pattern)
- [ ] Test/debug endpoints removed from production
- [ ] No PII or secrets in production logs
- [ ] `npm audit` runs in CI pipeline

---

*Report generated by comprehensive automated security audit. All findings verified against source code.*
