# Fix: Client Bug Fixes — May 2026

**Branch:** `fix/client-bugs-may-2026`
**Based on:** `test/notifications-workflow`

Fixes for bugs reported by client (Benji) via email.

---

## Tasks

- [x] Task 1: Fix New Hire Progress carousel arrows (no onClick handlers)
- [x] Task 2: Fix calendar overlap false positives (all-day events triggering conflict)
- [x] Task 3: Fix password reset for Staff/Admin accounts (only Applicants table queried)
- [x] Task 4: Investigate admin invite URL mismatch (`/accept-admin-invite` vs actual page route)
- [x] Task 5: Investigate meeting booking failure for "Deb" (likely missing email in Airtable)
- [x] Task 6: Verify Airtable schema has all required auth fields
- [x] Task 7: Fix claim/unclaim badge not updating immediately in the UI
- [x] Task 8: Fix unclaim UX — remove 4-second delay, fix icon, add tooltips to action buttons

---

## Implementation Notes

### Task 1 — New Hire Progress carousel arrows
**Commit:** `752b0be`
**File:** `components/dashboard/NewHireTracker.js`

The carousel scroll buttons had no `onClick` handlers — they were purely decorative. Fixed by:
- Adding `useRef` (imported alongside existing hooks)
- Attaching `ref={scrollRef}` to the scrollable container div
- Wiring `onClick={() => scrollRef.current?.scrollBy({ left: ±256, behavior: 'smooth' })}` to the left/right buttons

---

### Task 2 — Calendar overlap false positives (all-day events)
**Commit:** `e17b0ed`
**File:** `components/admin/users/applicant-drawer.js`

Two components (`MonthlyReviewActions` and `AppraisalDateSetter`) built a `date → events` map from Google Calendar. The old code used `ev.start?.dateTime || ev.start?.date` — all-day events use `ev.start.date` (e.g. `"2026-05-06"`), not `dateTime`. When parsed as `new Date("2026-05-06")`, this becomes midnight UTC, which overlaps with any timed slot on that day, triggering `hasConflict = true` and disabling the booking button.

Fixed by adding `if (!ev.start?.dateTime) continue` before processing each event, skipping all-day events entirely.

---

### Task 3 — Password reset for Staff/Admin accounts
**Commits:** `888e569`, `9107eaa`, `982247c`, `be10e6f`
**Files changed:**
- `src/app/api/admin/forgot-password/route.js` *(new file)*
- `src/app/api/forgot-password/route.js` *(updated)*
- `src/app/api/reset-password/route.js` *(updated)*
- `components/auth/AdminLoginForm.js` *(updated)*
- `src/app/forgot-password/page.js` *(updated)*

**What was broken:** The forgot-password flow only queried the `Applicants` table. Admins are in the `Staff` table — so admin password resets silently failed (no matching record, but returned the generic "email sent" message). Even if the email was sent, `reset-password` always queried `Applicants`, so the password update would fail for admins too.

**How it was fixed (end-to-end):**

1. **New `/api/admin/forgot-password` route** — queries `Staff` table filtered by `IsAdmin=TRUE()`. Writes a `Reset Nonce` to the Staff record, signs a JWT with `{ email, nonce, userTable: "Staff" }`, and fires the same Make.com webhook (`MAKE_WEBHOOK_URL_RESET_PASSWORD`).

2. **Updated `/api/forgot-password` route** — now encodes `userTable: "Applicants"` in the JWT payload so `reset-password` knows which table to use.

3. **Updated `/api/reset-password` route** — reads `userTable` from the decoded JWT and dynamically queries/updates either `Applicants` or `Staff`. Validates the `Reset Nonce` for single-use enforcement, then clears it on successful reset.

4. **`AdminLoginForm.js`** — "Forgot password?" now routes to `/forgot-password?isAdmin=true` instead of `/forgot-password`.

5. **`forgot-password/page.js`** — reads the `?isAdmin=true` query param. If true, calls `/api/admin/forgot-password`; otherwise calls `/api/forgot-password`. Back button returns to `/?mode=admin` for admins. Wrapped in `Suspense` (required for `useSearchParams` in Next.js App Router).

**Airtable fields required:**
- `Staff` table: `Reset Nonce` (Single line text) — ✅ created by user
- `Applicants` table: `Reset Nonce` (Single line text) — confirm this exists; if not, create it

**Make.com automation:** No changes needed. The same `PASSWORD_RESET_EMAIL` scenario handles both admin and user resets. It hardcodes `https://onboarding-task-manager.vercel.app` as the base URL (module 5) and appends `/reset-password?token={{1.resetToken}}` — works for both, since `reset-password` reads `userTable` from the JWT.

---

### Task 4 — Admin invite URL mismatch
**Commit:** `be10e6f`
**File:** `src/app/api/admin/invite-admin/route.js`

**Investigation finding:** There was no URL mismatch in the routing — `/accept-admin-invite` is the correct and active page (`src/app/accept-admin-invite/page.js`). The deprecated `/admin/accept-invite/page.js` exists but returns `null` with a comment noting the move.

**Actual bug found:** The invite route used `process.env.APP_BASE_URL` to build the invite link. This env var was never defined — only `NEXT_PUBLIC_APP_URL=https://onboarding-task-manager.vercel.app` existed in `.env.local`. In production on Vercel, the guard condition triggered and returned a 500 error, making it impossible to send admin invites.

**Fix:** Changed line 101 to:
```js
const envBase = (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "").trim()
```

`APP_BASE_URL` still takes precedence if set explicitly (e.g. for a custom domain), but now falls back to `NEXT_PUBLIC_APP_URL` which is already set on Vercel.

**Make.com automation:** No changes needed. `ADMIN_INVITE_EMAIL.json` uses `{{1.inviteLink}}` directly — it just forwards whatever URL the server sends. Our fix means the server now sends the correct production URL.

---

### Task 5 — Meeting booking failure for "Deb"
**No code changes required.**

**Investigation finding:** All applicant records have the `Email` field populated (it is a primary/required field in Airtable). The real root cause was Task 2.

The `hasConflict` flag disabled the Confirm button (`disabled={... || hasConflict}`) at line 2012 of `applicant-drawer.js`. If the admin calendar had any all-day events on Deb's chosen booking date, the old overlap detection parsed them as midnight UTC and flagged a false conflict — making the button un-clickable with no visible error. This was fixed by Task 2.

**To verify:** After deploying Task 2's fix, retry Deb's booking on the previously failing date.

---

### Bonus — Make.com email template fix
**Commit:** `be10e6f`
**File:** `docs/handover/automations/onboarding/PASSWORD_RESET_EMAIL.json`

The expiry label in the password reset email incorrectly referenced `{{13.$2}}` (raw unit letter like "h") instead of `{{14.time}}` (the human-readable "hour(s)" from module 14). Fixed in the JSON documentation.

---

---

### Task 6 — Airtable schema verification
**No code changes required.**

Confirmed all required auth fields exist in Airtable:
- `Staff` table: `Reset Nonce` (singleLineText) ✅, `Invite Nonce` (singleLineText) ✅
- `Applicants` table: `Reset Nonce` (singleLineText) ✅

Both fields were previously created by the client as instructed. No fields need to be added or deleted.

---

### Task 7 — Claim/unclaim badge not updating immediately
**Commits:** `16843a6`, `9536afe`
**File:** `components/dashboard/TaskManagement.js`

**What was broken:** After clicking Claim or Unclaim, the task badge ("Claimed" / "Unclaimed") did not update visually until `fetchTasks()` completed a full Airtable round-trip. From the user's perspective, the action looked like it had no effect. Attempting to claim again produced a 409 "already claimed by someone else" error, confirming the API worked but the UI was stale.

**Root cause:** `handleClaimTask` and the unclaim handler both relied solely on `fetchTasks()` for state updates. `completeTask` correctly uses an optimistic `setTasks` before the refetch — claim and unclaim were missing this.

**Fix:**
- **Claim:** After a successful API response, immediately set `task.for = ["__claimed__"]` in local state via `setTasks`. This makes `isGlobalTask()` return `false` instantly, flipping the badge. `fetchTasks()` then syncs the real Airtable value in the background.
- **Unclaim:** Same pattern — set `task.for = []` immediately so `isGlobalTask()` returns `true` and the badge reverts. `fetchTasks()` syncs afterwards.

---

### Task 8 — Unclaim UX: delay, icon, and missing tooltips
**Commit:** `16843a6`
**File:** `components/dashboard/TaskManagement.js`

**What was broken / confusing:**
1. Unclaim used the same 4-second delayed-timer pattern as task completion, so clicking "Unclaim" showed "Task will be unclaimed" toast but nothing happened visually for 4 seconds — looked broken.
2. The Unclaim dropdown item used the `<X>` icon, which reads as "delete" to most users.
3. The three-dot (`MoreHorizontal`) button on both unclaimed and claimed task cards had no tooltip, making it non-obvious for new admins.

**Fix:**
1. Removed the `setTimeout` / undo-timer from unclaim. The action now fires immediately (unclaiming is trivially reversible by re-claiming).
2. Swapped `<X>` for `<RotateCcw>` on the Unclaim dropdown item.
3. Wrapped both `MoreHorizontal` dropdown triggers (unclaimed and claimed card variants) with `<Tooltip>` / `<TooltipProvider>` showing "More actions".

---

### Bonus — Removed broken `createNotification` call from `create-task`
**Commit:** `1c75232`
**File:** `src/app/api/admin/tasks/create-task/route.js`

This call was silently failing on every task assignment. It passed an `Applicants` table record ID to `createNotification`, which queries the `Staff` table — the lookup always returned nothing. The `actionUrl` was also a placeholder (`https://yourapp.com/tasks/...`). The proper fix is tracked in `test/notifications-workflow` (see `TASK-test-notifications-workflow.md`).

---

## Testing Guide

### Task 1 — Carousel arrows
1. Log in as any user with new hires visible on the dashboard
2. Navigate to the New Hire Progress section
3. Click the `‹` and `›` arrow buttons — cards should scroll left/right smoothly

### Task 2 — Calendar overlap (also covers Task 5 / Deb)
1. Ensure there is at least one all-day event in the admin Google Calendar (e.g. a holiday or full-day block)
2. Log in as admin, open any applicant drawer
3. Open "Monthly Review" booking — pick a date that has an all-day event
4. Set valid start/end times — the "Selected time overlaps" warning should **not** appear
5. The Confirm button should be enabled; complete the booking
6. Retry Deb's specific booking date to confirm it now works

### Task 3 — Admin password reset
1. **Page routing:** Go to `/?mode=admin`, click "Forgot password?" — verify URL is `/forgot-password?isAdmin=true` and subtitle reads "Reset your admin account password"
2. **Applicant isolation:** Go to `/forgot-password` (no param) — verify subtitle reads "Reset your account password"
3. **Admin reset flow (full end-to-end):**
   - Enter a valid admin email on `/forgot-password?isAdmin=true`
   - Check that Make.com fires and an email arrives at that address
   - Click the reset link — verify it opens `/reset-password?token=...`
   - Set a new password
   - Log in with the new password on the Admin tab — should succeed
4. **Nonce single-use:** Try clicking the same reset link again — should return "This reset link has already been used"

### Task 4 — Admin invite
1. Log in as admin, navigate to user management, send an invite to a test email address
2. Check the received email — the invite link should contain `https://onboarding-task-manager.vercel.app/accept-admin-invite?token=...` (not `localhost:3000`)
3. Click the link — the accept-invite page should load correctly
4. Complete the invite flow (set password) and verify admin login works

> **Note for local dev testing:** In development, the invite link will correctly use `http://localhost:3000/accept-admin-invite?token=...` as the fallback. To test the production URL locally, temporarily set `NEXT_PUBLIC_APP_URL=http://localhost:3000` in `.env.local`.

### Task 6 — Airtable schema
No test needed — fields were verified directly via the Airtable Metadata API.

### Tasks 7 & 8 — Claim/unclaim badge and UX
1. Log in as admin, navigate to the task management view
2. Find an unclaimed task (badge shows "Unclaimed") — click the `+` (Claim) button
3. Badge should flip to "Claimed" **immediately** without waiting for a network round-trip
4. Open the three-dot (`⋯`) menu on the claimed task — hover over it first to confirm "More actions" tooltip appears
5. Click **Unclaim** (circular arrow icon) — badge should flip back to "Unclaimed" immediately
6. Confirm the toast says "Task unclaimed" (not "Task will be unclaimed")
7. Confirm no 4-second delay before the task moves back to the unclaimed list
