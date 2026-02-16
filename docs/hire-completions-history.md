# Hire Completions — History (Verified By)

## Goal
In the Admin Dashboard `Task Management` UI, the **Hire Completions → History** view shows a list of completed onboarding verification tasks, including **who verified** (i.e. who set the task to `Completed`).

## Data model (Airtable)
Table: `Tasks` (`tblCOusVRFrciv4Ck`)

Relevant fields:
- **Status**: `🚀 Status` (`fldcOYboUu2vDASCl`)
- **Applicant**: `👤 Assigned Applicant` (`fldo7oJ0uwiwhNzmH`)
- **Completed date**: `Completed Date` (`flddxTSDbSiHOD0a2`)
- **Completed by**: `Completed By` (`fld7fsKOvSDOQrgqn`) — link to `Staff`

## Write path (when an admin completes a task)
When an admin clicks **Complete** in the UI, the frontend calls:
- `PATCH /api/dashboard/tasks/:id` with `{ action: "complete" }`

The backend:
- Extracts `session.userStaffId` (Airtable `Staff` record ID) from the session cookie.
- Updates the `Tasks` record:
  - `🚀 Status` → `Completed`
  - clears `👨 Assigned Staff` and `Claimed Date` (task is no longer in an active queue)
  - writes `Completed By` → `[session.userStaffId]` (if present)
  - writes `Completed Date` → `YYYY-MM-DD`

Important behavior:
- If the session does **not** include `userStaffId`, the system still completes the task, but `Completed By` will be empty.

## Read path (history endpoint)
The History UI fetches:
- `GET /api/admin/reports/hire-completions?limit=...&applicantId=...`

The API returns items shaped like:
- `title`, `taskType`, `applicantName`
- `completedAt` (from `Completed Date`)
- `completedByName` resolved from `Completed By` → `Staff.Name`

### Missing verifier fallback
If `Completed By` is empty, the API returns:
- `completedByName: "-"` (and the UI also renders `"-"` as a fallback)

## Notes / Backfill
Existing completed tasks may not have `Completed By` populated (e.g. older records, completions done directly in Airtable, or sessions missing `userStaffId` at the time). Those will show `"-"` until the record is completed through the app with a valid admin session.

