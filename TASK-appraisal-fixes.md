# Appraisal System Fixes

**Branch:** master
**Description:** A series of bug fixes and improvements to the appraisals section in the Admin > Users > Applicant Drawer.

---

## Sub-tasks

- [x] Create task tracker
- [ ] **[PRIORITY]** No-template scenario: show info + "Set Template Questions" button; hide "Reset to Template" when no template exists
- [ ] Fix 1: Add "Mark done" buttons to appraisal steps in the history list
- [ ] Fix 3: Pass the actual appointment time to Airtable (currently always stores 09:00 UTC)
- [ ] Fix 4: Warn admin when setting a date for a year that already has an appraisal
- [ ] Fix 5: Show error banner when appraisal history JSON cannot be parsed (instead of silent empty state)
- [ ] Fix 6: Include admin user page link in Google Calendar event description

---

## Manual / External Steps Required

> These fixes require changes outside the codebase — they cannot be done by Claude.

### Fix 2 — Make.com: Year Matching Bug
**File:** `docs/handover/automations/onboarding/SEND_PREAPPRAISAL_360FEEDBACK_ACTION_PLAN.json`
**Where:** In the Make.com scenario editor, find the module named **"Complete Send Pre Appraisal Form Step"**
**Problem:** The JavaScript code block filters by `appraisal.year !== currentYear`. If an appraisal is booked across a year boundary (e.g. set in Dec for a Jan date) or for a future year, the step will never be marked as done even though the emails were sent.
**Fix:** Change the filter to match by `appraisalDate` proximity instead of year number. Replace:
```js
if (appraisal.year !== currentYear) return appraisal;
```
With logic that finds the entry whose `appraisalDate` falls within the scenario's trigger window (e.g. within ±30 days of today), rather than matching by calendar year.

---

## Files Changed

- `components/admin/users/applicant-drawer.js`
- `src/app/api/admin/users/[id]/appraisal-date/route.js`
