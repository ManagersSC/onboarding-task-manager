# TASK: Protect Docs Route Behind Admin Login

**Branch**: `delete/task-tracker-files` (current)
**Goal**: Move the Docsify documentation site out of `public/docs/` and serve it through a Next.js route handler protected by admin-only authentication.

## Why `public/` can't be protected by middleware
Next.js serves files in `public/` as static assets before middleware runs — there is no way to intercept them. The files must be moved to a non-public location and served via a route handler.

## Sub-tasks

- [x] Create task tracking file
- [x] Move `public/docs/` → `docs-content/` (project root, outside `public/`)
- [x] Create catch-all route handler at `src/app/docs/[[...slug]]/route.js`
  - Reads files from `docs-content/`
  - Returns correct Content-Type per file extension
  - Includes path traversal protection
- [x] Update `src/middleware.js` — add `/docs/:path*` to matcher and admin-only guard
- [x] Update `next.config.mjs` — add `outputFileTracingIncludes` for Vercel deployment bundling
