# TASK: Quick Security Vulnerability Fixes

**Branch:** `fix/quick-security-fixes`
**Description:** Fix 8 low-effort security vulnerabilities from SECURITY-AUDIT-REPORT.md

## Sub-tasks

- [x] **H13:** Gate debug data behind `NODE_ENV` in admin users endpoint
- [x] **M7 + L5:** Fix wrong webhook variable + error variable scoping bug in forgot-password
- [x] **M3:** Add missing `sameSite: 'lax'` on cookie in attachments route
- [x] **H11:** Add max array size (50) + Airtable ID format validation to bulk delete endpoints
- [x] **M9:** Gate test endpoints behind `NODE_ENV`
- [x] **L7:** Await `params` in Next.js 15 async routes
- [x] **M14:** Re-enable ESLint during builds
