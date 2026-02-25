# Notification System Overhaul

**Branch:** `fix/notification-system-overhaul` (from `docs/handover`)

Fix two silent bugs that stopped notifications from being created/displayed since ~Jan 9th, remove the rigid singleSelect type constraint, and add diagnostic tooling.

---

## Sub-tasks

- [x] Create `src/lib/notification-types.js` — centralized type constants
- [x] Refactor `src/lib/notifications.js` — remove silent try-catch, return structured result
- [x] Fix `src/app/api/notifications/route.js` — recipient filter formula (linked record, not text)
- [x] Update all `createNotification` call sites to use type constants:
  - [x] `src/app/api/complete-task/route.js`
  - [x] `src/app/api/admin/tasks/create-task/route.js`
  - [x] `src/app/api/admin/tasks/core-tasks/[id]/route.js`
  - [x] `src/app/api/admin/tasks/core-tasks/route.js`
  - [x] `src/app/api/admin/tasks/assigned-tasks/[id]/attachments/route.js`
  - [x] `src/app/api/admin/users/upload-document/route.js`
  - [x] `src/app/api/admin/users/[id]/appraisal-date/route.js`
  - [x] `src/app/api/admin/users/[id]/monthly-review/route.js`
  - [x] `src/app/admin/users/actions.js`
  - [x] `src/app/api/quizzes/[quizId]/route.js`
- [x] Create `src/app/api/admin/notifications/test/route.js` — diagnostic test endpoint

**Manual step (Airtable):** Change `Notifications.Type` field from `singleSelect` → `singleLineText`
