# TASK: Fix Assigned Tasks Search Bar

**Branch:** feat/assigned-tasks-delete
**Description:** Fix the search bar on /admin/assigned-tasks so it correctly searches by task title, applicant name, and applicant email.

## Sub-tasks

- [x] Fix the Airtable filter formula in `src/app/api/admin/tasks/assigned-tasks/route.js` — remove `ARRAYJOIN()` from text fields, scope search to Display Title, Applicant Name, and Applicant Email only
- [x] Fix URL encoding — switch to manual `encodeURIComponent` for filterByFormula so spaces encode as `%20` (not `+`) in field names
- [x] Fix sort param encoding — keep `sort[0][field]` bracket notation literal so Airtable recognises it
- [x] Replace `{Display Title}` formula field search with direct component field search — `{Task Title}` (ARRAYJOIN), `{Custom Task Title}` (plain), `{Quiz Title}` (ARRAYJOIN) since formula-wrapping-lookup fields are unreliable in filterByFormula context
- [x] Fix charCodeAt TypeError — normalize multipleLookupValues fields (Applicant Name, Email, Folder Name) to strings in list route response
- [x] Fix edit drawer — folder field changed from plain text to dropdown populated from folders API
- [x] Fix edit drawer — Assigned Date now displays correctly by slicing ISO-8601 createdTime to YYYY-MM-DD in single-record GET; also apply firstVal normalization to lookup fields in that endpoint
