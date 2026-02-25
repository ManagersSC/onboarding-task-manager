# Notification Preferences & UI Fixes

**Branch:** `fix/notification-preferences-and-ui` (from `docs/handover`)

Follow-up to PR #51. Fixes the preferences UI showing only already-enabled types, a hover bug in NotificationCenter, and adds 2 missing notification type constants.

---

## Sub-tasks

- [x] Add `QUIZ_FAILED` and `MONTHLY_REVIEW_CANCELLED` to `src/lib/notification-types.js`
- [x] Fix `allTypes` in `src/app/api/admin/profile/notification-preferences/route.js` — return full list from `NOTIFICATION_TYPES`
- [x] Fix `group` hover class in `components/dashboard/NotificationCenter.js`

**Manual Airtable step (before deploy):**
- Add `"Appraisal"` and `"Monthly Review"` options to `Staff → Notification Preferences` multipleSelects
- Fix `"Onboarding started"` → `"Onboarding Started"` in the same field
