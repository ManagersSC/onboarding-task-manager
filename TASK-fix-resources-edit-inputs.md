# TASK: Fix Resources Edit Sheet — All Input Fields

**Branch:** `fix/resources-edit-week-day-inputs`
**Description:** Fix all editable inputs in the TaskEditSheet (resource editor) on the Admin Resources page. Primary bug: Week and Day numbers cannot be changed due to a type mismatch in the PATCH API handler.

---

## Root Cause Analysis

- `Week Number` and `Day Number` are **numeric fields** in Airtable. The PATCH handler was sending string values (e.g. `"3"`) instead of numbers (`3`) — Airtable rejects this.
- `Folder Name` is a **linked record field** in Airtable (array of record IDs). The handler was sending a plain text name string — also rejected.
- `Job` is a **linked record field** in Airtable. Same issue.

---

## Sub-tasks

- [x] Create branch `fix/resources-edit-week-day-inputs`
- [x] Fix PATCH handler — parse `week` and `day` as integers before sending to Airtable
- [x] Fix PATCH handler — look up `Onboarding Folders` record by Name and send linked record ID for `Folder Name`
- [x] Fix PATCH handler — look up `Jobs` record by Title and send linked record ID for `Job`
- [x] Improve error handling in TaskEditSheet — surface actual server error message in toast
- [x] Improve success toast — add description "All changes have been saved."
- [x] Verify all other inputs (title, description, type, location, resourceUrl, attachments) are handled correctly
- [ ] Commit and push changes
- [ ] Open PR
