# TASK: Test & Debug Notifications Workflow

**Branch**: `test/notifications-workflow`
**Date**: 2026-04-19

---

## Sub-tasks

- [ ] Phase 1 — Read all notification code + Airtable schema (Phase 1 complete — see findings below)
- [ ] Phase 2 — Confirm answers to open questions with user
- [ ] Phase 3 — Fix Bug #1: `create-task` passes Applicants ID to createNotification (Staff-only system)
- [ ] Phase 4 — Fix Bug #2: `mark-all-read` uses session.userName instead of Staff name lookup
- [ ] Phase 5 — Fix Bug #3: `[id]/read` route has no ownership check (IDOR)
- [ ] Phase 6 — Fix Bug #4: Hardcoded `https://yourapp.com/tasks/...` action URLs
- [ ] Phase 7 — Fix Bug #5: Polling interval re-creation on every loading state change
- [ ] Phase 8 — Fix Bug #6: `since` incremental filter uses LAST_MODIFIED_TIME (causes read notifs to resurface)
- [ ] Phase 9 — Verify end-to-end test via /api/admin/notifications/test endpoint

---

## Bugs Found (Phase 1 Investigation)

### BUG #1 — CRITICAL: Wrong recipient type in `create-task`
**File**: `src/app/api/admin/tasks/create-task/route.js:217`
**Problem**: `createNotification` is called with `applicantRecord.id` — a record ID from the
`Applicants` table. But `createNotification` (notifications.js:51) queries the `Staff` table for
this ID. Applicants and Staff are separate Airtable tables. The Staff lookup returns nothing,
so the function returns `{ ok: false, error: "Staff user not found..." }`. Task-assignment
notifications for new hires silently never send.
**Confirmed via schema**: Applicants = tbl4ldFExsS5hWR3L, Staff = tblfXqkA0Cna59UUk.

---

### BUG #2 — HIGH: `mark-all-read` uses wrong source of truth for staff name
**File**: `src/app/api/notifications/mark-all-read/route.js:40`
**Problem**: Filter `{Recipient} = '${userName}'` uses `session.userName` directly.
The GET /api/notifications route correctly looks up the Staff `Name` from Airtable by email
(because session.userName may differ from the actual Name field). mark-all-read skips this
lookup. If there is any mismatch between session.userName and the Airtable Staff Name, this
query returns 0 records and marks nothing as read.

---

### BUG #3 — MEDIUM: No ownership check in `[id]/read` (IDOR)
**File**: `src/app/api/notifications/[id]/read/route.js:38`
**Problem**: Any authenticated user can mark any notification as read using a valid notification
record ID. No check that `notification.Recipient` matches the requesting user.

---

### BUG #4 — MEDIUM: Hardcoded placeholder URLs in `actionUrl`
**Files**:
- `src/app/api/admin/tasks/create-task/route.js:223`
- `src/app/api/complete-task/route.js:274`
**Problem**: `actionUrl: "https://yourapp.com/tasks/${taskId}"` — this domain is a placeholder,
not the real app URL. All notification action links are broken.

---

### BUG #5 — LOW: Polling interval resets on every loading state change
**File**: `src/hooks/useNotifications.js:104-115`
**Problem**: `isInitialLoading` and `isRefreshing` are in the `useEffect` dependency array for
the polling interval. Every time a fetch starts or completes, the 30-second timer is cleared
and restarted. A slow fetch (e.g. 5s) effectively pushes the next poll by 5s each time.
These should be tracked as refs inside the interval callback, not as re-run triggers.

---

### BUG #6 — LOW: Incremental `since` filter uses LAST_MODIFIED_TIME
**File**: `src/app/api/notifications/route.js:73`
**Problem**: `IS_AFTER(LAST_MODIFIED_TIME(), '${since}')` — LAST_MODIFIED_TIME updates whenever
ANY field on the record changes, including the `Read` field. So when a user marks a notification
as read, the `Read=true` update changes LAST_MODIFIED_TIME, and that notification appears again
in the next incremental poll response. The frontend mergeNotifications logic handles this (it
updates existing records), but it means already-read notifications silently re-enter the stream.
Better to use `IS_AFTER({Created At}, '${since}')` for new-only detection, separate from read-state syncing.

---

### OBSERVATION — Empty default Notification Preferences = silent no-ops
**File**: `src/lib/notifications.js:71`
**Problem**: `if (!preferences.includes(type)) return { ok: true }` — if a Staff member's
`Notification Preferences` multi-select is empty (never configured), ALL notifications for
them are silently swallowed. New staff accounts will never receive any notification until
they manually set up preferences in the UI. There is no default/fallback.

---

### OBSERVATION — "Task Creation" Airtable choice has no matching code constant
**Table**: Staff → Notification Preferences
**Problem**: Airtable has "Task Creation" as a multiselect option, but
`NOTIFICATION_TYPES` in `notification-types.js` has no "Task Creation" constant.
If a staff member has "Task Creation" enabled in their preferences, no code path
will ever trigger a notification with that type. Likely a stale option.

---

## Open Questions (need user answers before fixing)

1. **Applicant notifications**: When `create-task` assigns a task to an applicant, should the
   notification go to the applicant themselves, or to an admin/manager? Currently the code
   attempts to notify the applicant, but `createNotification` is Staff-only.
   - If applicants should receive in-app notifications, they need Staff records (or a separate
     notification system).
   - If the intent is to notify the *admin who assigned the task* instead, the recipientId
     should be the admin's Staff record ID, not the applicant's.

2. **session.userName vs Staff Name**: Does the `userName` stored in the session always exactly
   match the `Name` primary field in the Staff Airtable table? If they can diverge (e.g.
   display name vs login name), `mark-all-read` will silently fail.

3. **Staff Notification Preferences setup**: Have the staff accounts in Airtable had their
   `Notification Preferences` multi-select configured? If empty, no in-app notifications
   will ever appear regardless of other fixes.

4. **App domain for actionUrl**: What is the real production URL to replace the
   `https://yourapp.com/tasks/...` placeholder?
