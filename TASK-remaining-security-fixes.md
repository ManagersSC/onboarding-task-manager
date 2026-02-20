# TASK: Remaining Security Vulnerability Fixes

**Branch:** `fix/remaining-security-vulnerabilities`
**Description:** Fix all remaining High, Medium, and Low security vulnerabilities from SECURITY-AUDIT-REPORT.md (excluding M4 Redis migration and L3 structured logger)

## Sub-tasks

### High Priority
- [x] **H1:** Add auth API routes to public exemptions in middleware (already done in critical fixes)
- [x] **H2:** Fix IDOR in complete-task — verify task ownership
- [x] **H3:** Fix silent auth failure in dashboard tasks PATCH/DELETE + add auth to GET
- [x] **H4:** Add ownership checks on dashboard task operations (only admins can delete)
- [x] **H5:** Create shared password validation, enforce on sign-up + reset-password
- [x] **H6:** Invalidate reset token after use (nonce pattern)
- [x] **H7:** Invalidate admin invite token after use (nonce pattern)
- [x] **H8:** Fix rate limiter IP source to use non-spoofable header
- [x] **H9:** Add file size limits to upload endpoints (10MB max)
- [x] **H10:** Add file type validation to upload endpoints (allowlist MIME types)
- [x] **H12:** Sanitize all dangerouslySetInnerHTML with DOMPurify (6 files)
- [x] **H14:** Remove Google refresh token console.log (write to file instead)

### Medium Priority
- [x] **M1:** Add global security headers to next.config.mjs (HSTS, CSP, X-Frame-Options, etc.)
- [x] **M2:** Add CSRF protection via Sec-Fetch-Site header validation
- [x] **M5:** Fix account enumeration — use identical error messages in login routes
- [x] **M6:** Fix timing attack on login — compare against dummy hash when user not found
- [x] **M8:** Sanitize error messages in production across API routes (gate behind NODE_ENV)
- [x] **M10:** Add server-side auth check in admin layout (defense-in-depth)
- [x] **M11:** Add field name allowlist to upload endpoints
- [x] **M12:** Fix mass assignment in dashboard task creation (use session staffId, validate inputs)
- [x] **M13:** Fix CSV injection in audit log export (prefix dangerous characters)
- [x] **M15:** Add client-side file type/size validation to upload components

### Low Priority
- [x] **L1:** Gate debug endpoints behind NODE_ENV
- [x] **L2:** Remove PII from production logs
- [x] **L4:** Fix host header injection in invite link (require APP_BASE_URL in production)
- [x] **L6:** Remove unused next-auth dependency
