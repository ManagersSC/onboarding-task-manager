# New Hire Tracker — Progress Calculation (Restored Task-Log Logic)

## Summary
The **New Hire Tracker** progress bar in `@components/dashboard/NewHireTracker.js` displays `hire.progress`.

That value is computed server-side by `GET /api/admin/dashboard/new-hires` (`src/app/api/admin/dashboard/new-hires/route.js`).

## Current (Restored) Logic
Progress is derived from Airtable task completion logs (the “old” approach).

- **Source table**: `Onboarding Tasks Logs`
- **Join mechanism**: the log record must contain the applicant’s email in the `{Assigned}` field (the code uses `FIND(email, ARRAYJOIN({Assigned}))`)
- **Fields read**: `Status`, `Task`

### How the percentage is computed
- `total` = number of matching task log rows
- `completed` = number of matching task log rows where `Status === "Completed"`
- `progress` = `Math.round((completed / total) * 100)` (or `0` if `total === 0`)

The API also returns `tasks: { completed, total }` for display/debugging.

## Why this change was needed
The newer status-mapping approach depended on Applicant field **`Onboarding Status`** matching a fixed list of strings. If Airtable values drift (renames, emoji differences, blanks), progress falls back to **0** for all records.

The task-log approach is **data-driven** and reflects actual task completion.

## Airtable Requirements
- Applicants must have a valid **Email** value.
- `Onboarding Tasks Logs` must store an **Assigned** field containing that email address (directly or via array join).
- `Onboarding Tasks Logs.Status` must use the literal string **`Completed`** for completed tasks.

