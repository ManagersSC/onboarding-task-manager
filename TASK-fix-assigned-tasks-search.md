# TASK: Fix Assigned Tasks Search Bar

**Branch:** feat/assigned-tasks-delete
**Description:** Fix the search bar on /admin/assigned-tasks so it correctly searches by task title, applicant name, and applicant email.

## Sub-tasks

- [ ] Fix the Airtable filter formula in `src/app/api/admin/tasks/assigned-tasks/route.js` — remove `ARRAYJOIN()` from text fields, scope search to Display Title, Applicant Name, and Applicant Email only
