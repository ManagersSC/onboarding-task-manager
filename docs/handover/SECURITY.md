# Security Implementation — Developer Handover

> **Last updated:** 2026-02-20
> **Audit report:** [`SECURITY-AUDIT-REPORT.md`](../../SECURITY-AUDIT-REPORT.md) (root)
> **Fix tracking:** [`TASK-critical-security-fixes.md`](../../TASK-critical-security-fixes.md), [`TASK-quick-security-fixes.md`](../../TASK-quick-security-fixes.md), [`TASK-remaining-security-fixes.md`](../../TASK-remaining-security-fixes.md)

This document describes every security mechanism in the application, where the code lives, and what you need to know to maintain it safely.

---

## Table of Contents

1. [Authentication & Sessions](#1-authentication--sessions)
2. [Middleware Security Pipeline](#2-middleware-security-pipeline)
3. [Role-Based Access Control (RBAC)](#3-role-based-access-control-rbac)
4. [CSRF Protection](#4-csrf-protection)
5. [Rate Limiting](#5-rate-limiting)
6. [Input Sanitization — Airtable Formulas](#6-input-sanitization--airtable-formulas)
7. [Password Security](#7-password-security)
8. [Single-Use Tokens (Nonce Pattern)](#8-single-use-tokens-nonce-pattern)
9. [File Upload Security](#9-file-upload-security)
10. [XSS Prevention — DOMPurify](#10-xss-prevention--dompurify)
11. [SSRF Protection — File Proxy](#11-ssrf-protection--file-proxy)
12. [HTTP Security Headers](#12-http-security-headers)
13. [CORS Configuration](#13-cors-configuration)
14. [CSV Injection Prevention](#14-csv-injection-prevention)
15. [Error Handling in Production](#15-error-handling-in-production)
16. [Logging & PII](#16-logging--pii)
17. [Debug / Test Endpoints](#17-debug--test-endpoints)
18. [Dependencies](#18-dependencies)
19. [Airtable Field Requirements](#19-airtable-field-requirements)
20. [Environment Variables — Security-Related](#20-environment-variables--security-related)
21. [Known Limitations & Deferred Items](#21-known-limitations--deferred-items)
22. [Security Checklist for New Features](#22-security-checklist-for-new-features)

---

## 1. Authentication & Sessions

**Library:** `iron-session` (sealed/encrypted cookies)

**How it works:**
- On login, session data is sealed with `SESSION_SECRET` and stored in an `httpOnly`, `secure`, `sameSite: lax` cookie named `session`.
- Session TTL is 8 hours (`60 * 60 * 8`).
- Session data contains: `userEmail`, `userRole`, `userName`, and optionally `userStaffId` (for admin users).

**Key files:**
| File | Purpose |
|------|---------|
| `src/app/api/login/route.js` | User login — sets session cookie |
| `src/app/api/admin/login/route.js` | Admin login — sets session with `userRole: "admin"` |
| `src/app/api/sign-up/route.js` | Sign-up — immediately logs in user after registration |
| `src/app/api/admin/accept-invite/route.js` | Invite acceptance — auto-login after password set |
| `src/app/api/logout/route.js` | Clears session cookie |
| `src/middleware.js` | Validates session on every protected request |

**Rules:**
- Every protected API route must validate the session. Middleware covers this globally, but individual routes that need `userEmail` or `userStaffId` unseal the session themselves.
- Never store plain-text credentials in cookies. The `iron-session` seal handles encryption.
- Cookie settings: `httpOnly: true`, `secure: true` (production), `sameSite: 'lax'`, `path: '/'`.

---

## 2. Middleware Security Pipeline

**File:** `src/middleware.js`

The middleware runs on every request matching `/api/*`, `/admin/*`, and `/dashboard/*`. The checks execute in this order:

```
Request
  │
  ├─ 1. Rate limiting (strict or relaxed)
  │
  ├─ 2. CSRF validation (Sec-Fetch-Site on non-GET API requests)
  │
  ├─ 3. Public route check (skip auth for login, sign-up, etc.)
  │
  ├─ 4. Session validation (unseal cookie, verify userEmail exists)
  │
  ├─ 5. Admin role check (for /admin/* and /api/admin/* routes)
  │
  └─ NextResponse.next()
```

**Public routes (no auth required):**
- Pages: `/`, `/signup`, `/forgot-password`, `/accept-admin-invite`
- APIs: `/api/login`, `/api/admin/login`, `/api/sign-up`, `/api/forgot-password`, `/api/reset-password`, `/api/admin/accept-invite`

**Admin API exemptions** (no admin role check):
- `/api/admin/login`, `/api/admin/accept-invite`

**Adding a new public route:** Add it to the `isPublicPage` or `isPublicApi` arrays in middleware. If it's an admin route that doesn't require auth, add it to `adminApiExemptions`.

---

## 3. Role-Based Access Control (RBAC)

**Roles:** `admin`, `user` (team member / clinic manager)

**Enforcement layers (defense-in-depth):**

| Layer | File | What it does |
|-------|------|--------------|
| Middleware | `src/middleware.js` | Blocks non-admins from `/admin/*` pages and `/api/admin/*` endpoints |
| Admin Layout | `src/app/admin/layout.js` | Server-side session check — redirects non-admins (defense-in-depth) |
| Individual routes | Various `/api/admin/*` routes | Route-level session + role validation |

**Dashboard task operations:**
- All PATCH/DELETE/GET handlers in `src/app/api/dashboard/tasks/[id]/route.js` require authentication via a shared `requireAuth()` helper.
- DELETE is restricted to `admin` role only.
- The `requireAuth()` function returns session data or a 401 Response — no silent failures.

---

## 4. CSRF Protection

**File:** `src/middleware.js`

**Mechanism:** `Sec-Fetch-Site` header validation.

Browsers automatically send `Sec-Fetch-Site` on all requests. The middleware blocks non-GET API requests where `sec-fetch-site` is anything other than `same-origin` or `same-site`.

```javascript
// Requests from cross-site origins are blocked
if (secFetchSite && secFetchSite !== 'same-origin' && secFetchSite !== 'same-site') {
  return 403
}
```

**Important:** Requests with **no** `sec-fetch-site` header (e.g. from server-to-server calls like Make.com webhooks) are allowed through. This is intentional — non-browser clients don't send Sec-Fetch headers.

---

## 5. Rate Limiting

**File:** `src/lib/rateLimiter.js`

**Configuration:**
| Endpoint type | Limit | Window |
|---------------|-------|--------|
| Auth endpoints (login, sign-up, forgot-password, reset-password, create-admin) | 30 req/min | 60s |
| All other API routes | 300 req/min | 60s |

**IP resolution (VULN-H8):**
Uses `x-real-ip` header (Vercel-provided, non-spoofable) with fallback to the first IP in `x-forwarded-for`. Never trusts the full `x-forwarded-for` chain.

```javascript
const ip = req.headers.get('x-real-ip')
  || req.headers.get('x-forwarded-for')?.split(',')[0].trim()
  || '127.0.0.1';
```

**Limitation:** Rate limiting is in-memory (`Map`). Each serverless instance has its own store. This means limits are per-instance, not global. A Redis/Upstash migration is deferred (see [Known Limitations](#21-known-limitations--deferred-items)).

**Return value:** Returns `null` when the request should proceed; returns a `429 Response` when rate-limited. This is critical — the middleware checks `if (response)` to decide whether to block.

---

## 6. Input Sanitization — Airtable Formulas

**File:** `src/lib/airtable/sanitize.js`

**Problem:** Airtable formula injection. User input interpolated directly into `filterByFormula` strings can manipulate queries.

**Solution:** `escapeAirtableValue()` escapes backslashes and single quotes:

```javascript
export function escapeAirtableValue(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
```

**Usage (mandatory for all Airtable queries with user input):**
```javascript
import { escapeAirtableValue } from '@/lib/airtable/sanitize';
filterByFormula: `{Email}='${escapeAirtableValue(email)}'`
```

**Applied in:** `login`, `admin/login`, `sign-up`, `forgot-password`, `reset-password`, `user`, `admin/create-admin`, `complete-task`, `quizzes/[quizId]/submission`, `admin/users/[id]`, `dashboard/tasks`, `admin/audit-logs/export`, `admin/invite-admin`.

---

## 7. Password Security

**File:** `src/lib/validation/password.js`

**Rules enforced on sign-up, reset-password, and accept-invite:**
1. Minimum 8 characters
2. Must contain at least one special character (non-alphanumeric)
3. Cannot contain consecutive number sequences (012, 123, 234, ... 789)

```javascript
import { validatePassword } from '@/lib/validation/password';
const result = validatePassword(password);
if (!result.valid) return Response.json({ error: result.message }, { status: 400 });
```

**Hashing:** `bcryptjs` with salt rounds = 10.

**Timing attack prevention (VULN-M6):**
When a user is not found or has no password, login routes compare against a dummy bcrypt hash to ensure constant-time response:

```javascript
const DUMMY_HASH = "$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012";
if (users.length === 0) {
  await bcrypt.compare(password, DUMMY_HASH); // constant time
  return Response.json(genericError, { status: 401 });
}
```

**Account enumeration prevention (VULN-M5):**
Login routes return identical error messages regardless of whether the user exists, has no password, or provided the wrong password: `"Invalid email or password."`.

---

## 8. Single-Use Tokens (Nonce Pattern)

Prevents token replay attacks on password reset and admin invite flows.

### Password Reset (VULN-H6)

| Step | File | Action |
|------|------|--------|
| 1. Generate | `src/app/api/forgot-password/route.js` | Creates `crypto.randomUUID()` nonce, stores in Airtable `Applicants.Reset Nonce`, includes in JWT payload |
| 2. Verify | `src/app/api/reset-password/route.js` | Extracts `nonce` from JWT, compares with stored `Reset Nonce`. If mismatch → "This reset link has already been used" |
| 3. Invalidate | `src/app/api/reset-password/route.js` | Clears `Reset Nonce` to empty string after successful password change |

### Admin Invite (VULN-H7)

| Step | File | Action |
|------|------|--------|
| 1. Generate | `src/app/api/admin/invite-admin/route.js` | Creates nonce, stores in `Staff.Invite Nonce`, includes in JWT |
| 2. Verify | `src/app/api/admin/accept-invite/route.js` | Compares JWT nonce with stored `Invite Nonce` |
| 3. Invalidate | `src/app/api/admin/accept-invite/route.js` | Clears `Invite Nonce` after password is set |

**Airtable fields required:** See [Section 19](#19-airtable-field-requirements).

---

## 9. File Upload Security

**Server-side validation** — `src/app/api/admin/users/upload-document/route.js`:

| Check | Value |
|-------|-------|
| Max file size | 10 MB (`10 * 1024 * 1024` bytes) |
| Allowed MIME types | `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `image/jpeg`, `image/png`, `image/gif`, `image/webp` |
| Blocked extensions | `.exe`, `.bat`, `.cmd`, `.sh`, `.ps1`, `.html`, `.htm`, `.svg`, `.js` |
| Field name allowlist | Only specific Airtable field names are accepted (e.g. `CV`, `Passport`, `DBS`, etc.) — prevents writing to arbitrary fields |

**Client-side validation** — `components/admin/users/upload-dropzone.js` and `components/admin/users/admin-document-upload.js`:
- Same size/type/extension rules as server-side.
- `accept` attribute on `<input type="file">` restricts file picker.
- Validation errors displayed inline.

**Adding a new document type:**
1. Add the Airtable field name to `ALLOWED_UPLOAD_FIELDS` in `upload-document/route.js`.
2. Add the type to `DOCUMENT_TYPES` in `admin-document-upload.js`.

---

## 10. XSS Prevention — DOMPurify

**Library:** `dompurify`
**Sanitizer:** `src/lib/utils/sanitize.js`

```javascript
import { sanitizeHtml } from "@/lib/utils/sanitize";
<div dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }} />
```

**Applied in these files:**
| File | Instances |
|------|-----------|
| `components/quiz/question-item.jsx` | Question text + option text (radio & checkbox) |
| `components/quiz/info-item.jsx` | Info block text |
| `components/quiz/preview-renderer.jsx` | Content + options (info, checkbox, radio) |
| `src/app/admin/quizzes/page.js` | Quiz option previews |

**Rule:** Every `dangerouslySetInnerHTML` in the codebase **must** use `sanitizeHtml()`. If you add new `dangerouslySetInnerHTML` usage, always wrap the content.

---

## 11. SSRF Protection — File Proxy

**File:** `src/app/api/admin/files/proxy/route.js`

The file proxy fetches Airtable attachment URLs on behalf of the client. It was vulnerable to SSRF (fetching any URL with the Airtable API key).

**Protections:**
1. **URL allowlist:** Only `dl.airtable.com` and `v5.airtableusercontent.com` hostnames allowed.
2. **HTTPS only:** Rejects non-HTTPS URLs.
3. **No redirects:** `redirect: 'error'` prevents redirect-based bypasses.

---

## 12. HTTP Security Headers

**File:** `next.config.mjs` — `headers()` function

Applied globally to all routes (`/:path*`):

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Prevents MIME type sniffing |
| `X-Frame-Options` | `DENY` | Prevents clickjacking |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controls referrer leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disables unused browser APIs |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Forces HTTPS for 2 years |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' https://v5.airtableusercontent.com https://dl.airtable.com data:; frame-ancestors 'none';` | XSS mitigation |

**CSP notes:**
- `'unsafe-inline'` and `'unsafe-eval'` are needed for Next.js client-side rendering. Removing them would break the app.
- `img-src` includes Airtable CDN domains for attachment previews.
- `frame-ancestors 'none'` matches `X-Frame-Options: DENY`.

---

## 13. CORS Configuration

**File:** `next.config.mjs`

```javascript
const allowedOrigin = process.env.APP_BASE_URL || "https://onboarding.smilecliniq.com"
```

| Header | Value |
|--------|-------|
| `Access-Control-Allow-Origin` | `APP_BASE_URL` env var (not wildcard `*`) |
| `Access-Control-Allow-Credentials` | `true` |
| `Access-Control-Allow-Methods` | `GET,POST,PATCH,DELETE,OPTIONS` |
| `Access-Control-Allow-Headers` | `Content-Type, X-Requested-With` |

Applied only to `/api/*` routes.

---

## 14. CSV Injection Prevention

**File:** `src/app/api/admin/audit-logs/export/route.js`

The CSV export prefixes cell values that start with formula-trigger characters (`=`, `+`, `-`, `@`, `\t`, `\r`) with a single quote `'`. This prevents Excel from executing them as formulas.

---

## 15. Error Handling in Production

**Rule:** Never expose `error.message` or stack traces in production API responses.

**Pattern:**
```javascript
return Response.json({
  error: "Internal server error",
  details: process.env.NODE_ENV === "development" ? error.message : undefined,
}, { status: 500 });
```

Internal logging (`logger.error(...)` / `logAuditEvent(...)`) still captures the full error for debugging.

**Applied in:** `login`, `admin/login`, `dashboard/tasks`, `dashboard/tasks/claim-all`, `complete-task`, `admin/files/proxy`, and other routes.

---

## 16. Logging & PII

**Rule:** Do not log email addresses, names, or other PII in production.

| File | Change |
|------|--------|
| `src/middleware.js` | Logs `session.userRole` instead of `session.userEmail` |
| `src/app/api/admin/login/route.js` | Session creation log omits email in production |

Audit log entries (`logAuditEvent`) are stored in Airtable's `Website Audit Log` table and intentionally contain user identifiers for security auditing purposes — this is fine because it's a private database, not a public log stream.

---

## 17. Debug / Test Endpoints

**Debug endpoints (gated behind `NODE_ENV`):**
- `src/app/api/admin/users/[id]/debug-feedback/route.js` — returns 404 in production
- `src/app/api/admin/users/[id]/debug-documents/route.js` — returns 404 in production

**Test endpoints (gated behind `NODE_ENV`):**
- `src/app/api/admin/users/bulk-delete/test/route.js`
- `src/app/api/admin/tasks/bulk-delete/test/route.js`
- `src/app/api/admin/tasks/bulk-create/test/route.js`
- `src/app/api/admin/users/test/route.js`

These return early with a 403 when `NODE_ENV === "production"` (implemented in the quick-security-fixes PR).

---

## 18. Dependencies

**Security-relevant packages:**

| Package | Version | Purpose |
|---------|---------|---------|
| `iron-session` | ^8.0.4 | Encrypted session cookies |
| `bcryptjs` | ^3.0.2 | Password hashing |
| `jsonwebtoken` | ^9.0.2 | JWT for reset/invite tokens |
| `dompurify` | ^3.3.1 | HTML sanitization for XSS prevention |
| `zod` | ^3.24.3 | Input validation schemas |

**Removed:**
- `next-auth` — was unused, removed to reduce attack surface.

**Maintenance:** Run `npm audit` regularly. The current audit shows inherited vulnerabilities from transitive deps — monitor and update as patches are released.

---

## 19. Airtable Field Requirements

The nonce pattern requires these fields to exist in Airtable:

| Table | Field Name | Type | Purpose |
|-------|-----------|------|---------|
| `Applicants` | `Reset Nonce` | Single line text | Stores UUID for single-use password reset tokens |
| `Staff` | `Invite Nonce` | Single line text | Stores UUID for single-use admin invite tokens |

**If these fields don't exist**, the forgot-password and invite-admin flows will fail with an Airtable error. Create them as single-line text fields if they're missing.

---

## 20. Environment Variables — Security-Related

| Variable | Required | Purpose |
|----------|----------|---------|
| `SESSION_SECRET` | Yes | iron-session encryption key. Must be 32+ characters. |
| `JWT_SECRET` | Yes | Signing key for reset/invite tokens. |
| `APP_BASE_URL` | Yes (production) | Used for CORS origin, invite links. Required in production to prevent host header injection. |
| `AIRTABLE_API_KEY` | Yes | Airtable API access. Never expose client-side. |
| `AIRTABLE_BASE_ID` | Yes | Airtable base identifier. |
| `MAKE_WEBHOOK_URL_RESET_PASSWORD` | Yes | Webhook for password reset emails. |
| `MAKE_WEBHOOK_URL_ADMIN_PASSWORD_PAGE` | Yes | Webhook for admin invite emails. |

---

## 21. Known Limitations & Deferred Items

| Item | Risk Level | Description | Recommendation |
|------|-----------|-------------|----------------|
| **In-memory rate limiting** (VULN-M4) | Medium | Each serverless instance has its own `Map`. A distributed attacker can bypass limits. | Migrate to Upstash Redis when budget allows. |
| **No structured logging** (VULN-L3) | Low | `console.log` used in many places instead of structured logger. Winston is installed but not used everywhere. | Gradually migrate to `logger` from `src/lib/utils/logger.js`. |
| **CSP uses unsafe-inline/unsafe-eval** | Low | Required by Next.js. Can be tightened with nonce-based CSP if needed. | Consider `next-safe` or nonce-based CSP in future. |
| **IDOR on dashboard task operations** (VULN-H4) | Low (mitigated) | Task assignment checks rely on Airtable field matching. Full ownership verification would need fetching the task record before each operation. Current mitigation: auth required + admin-only delete. | Add task ownership verification if staff can only see their own tasks. |

---

## 22. Security Checklist for New Features

Use this when building new features:

- [ ] **Authentication:** Does the new route require auth? If so, is it behind middleware and/or has its own session check?
- [ ] **Authorization:** Does it need role checks? Admin-only routes must check `session.userRole === "admin"`.
- [ ] **Input validation:** Is all user input validated? Use Zod schemas for structured input, `escapeAirtableValue()` for Airtable queries.
- [ ] **Error responses:** Does the error response avoid leaking `error.message` in production?
- [ ] **File uploads:** Are file size, type, and extension validated on both client and server?
- [ ] **HTML rendering:** Does any `dangerouslySetInnerHTML` use `sanitizeHtml()`?
- [ ] **New Airtable queries:** Is user input escaped with `escapeAirtableValue()`?
- [ ] **New API endpoint:** Is it covered by the middleware matcher? Check `config.matcher` in `src/middleware.js`.
- [ ] **Sensitive data:** Are tokens, passwords, or PII kept out of logs and client responses?
- [ ] **CSRF:** Non-GET endpoints are automatically protected by middleware. No action needed unless the endpoint needs to accept cross-origin requests (add to exemptions if so).

---

*Document created as part of the security audit remediation. See the full audit report for vulnerability details and severity ratings.*
