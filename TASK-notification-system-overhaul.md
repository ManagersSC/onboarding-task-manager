# Notification System Overhaul

**Branch:** `fix/notification-system-overhaul` (from `docs/handover`)

Fix two silent bugs that stopped notifications from being created/displayed since ~Jan 9th, remove the rigid singleSelect type constraint, and add diagnostic tooling.

---

## Sub-tasks

- [ ] Create `src/lib/notification-types.js` — centralized type constants
- [ ] Refactor `src/lib/notifications.js` — remove silent try-catch, return structured result
- [ ] Fix `src/app/api/notifications/route.js` — recipient filter formula (linked record, not text)
- [ ] Update all `createNotification` call sites to use type constants:
  - [ ] `src/app/api/complete-task/route.js`
  - [ ] `src/app/api/admin/tasks/create-task/route.js`
  - [ ] `src/app/api/admin/tasks/core-tasks/[id]/route.js`
  - [ ] `src/app/api/admin/tasks/core-tasks/route.js`
  - [ ] `src/app/api/admin/tasks/assigned-tasks/[id]/attachments/route.js`
  - [ ] `src/app/api/admin/users/upload-document/route.js`
  - [ ] `src/app/api/admin/users/[id]/appraisal-date/route.js`
  - [ ] `src/app/api/admin/users/[id]/monthly-review/route.js`
  - [ ] `src/app/admin/users/actions.js`
  - [ ] `src/app/api/quizzes/[quizId]/route.js`
- [ ] Create `src/app/api/admin/notifications/test/route.js` — diagnostic test endpoint

**Manual step (Airtable):** Change `Notifications.Type` field from `singleSelect` → `singleLineText`
