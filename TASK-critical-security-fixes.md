# TASK: Critical Security Vulnerability Fixes

**Branch:** `fix/critical-security-vulnerabilities`
**Description:** Fix all 7 critical security vulnerabilities identified in SECURITY-AUDIT-REPORT.md

## Sub-tasks

- [x] **VULN-C1:** Fix rate limiter to return `null` instead of `NextResponse.next()` (auth bypass)
- [x] **VULN-C2:** Uncomment + fix admin creation auth check with iron-session
- [x] **VULN-C3:** Add URL allowlist to file proxy (SSRF prevention)
- [x] **VULN-C4:** Create Airtable formula sanitizer + apply to all affected files (13 files patched)
- [x] **VULN-C5:** Add admin role enforcement for `/api/admin/*` routes in middleware
- [x] **VULN-C6:** Add authentication to send-email endpoint
- [x] **VULN-C7:** Replace CORS wildcard `*` with environment-based origin
