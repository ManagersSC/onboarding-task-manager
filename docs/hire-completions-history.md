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

## Task document link (View task document)

Admins can open the **task document** (resource URL the hire used) from the Hire Completions modal.

### Data model
- **Tasks** table has a linked record **Onboarding Tasks Logs** (`fldf8A3QyMjHKxnKR`) and a **Lookup** **Display Resource Link** (`flduO7hnHXoRRyiqo`) that pulls the current URL from the linked Onboarding Tasks Logs record.
- **Onboarding Tasks Logs** has the inverse field **Verification Tasks** (`fld7GzNO0qjuSeHuh`).

The URL is never copied into Tasks; it is read via the Lookup so if the link is updated in Onboarding Tasks Logs, the modal shows the updated URL.

### Write path (when a hire completes a task)
`POST /api/complete-task` creates a verification record in Tasks and sets **Onboarding Tasks Logs** to `[taskId]` (the log record that was completed). The Lookup **Display Resource Link** then reflects the document URL from that log.

### Read path
- **Dashboard tasks** (`GET /api/dashboard/tasks`): includes **Display Resource Link**; each task is mapped with `taskDocumentUrl` (normalized from the lookup value).
- **Hire-completions** (`GET /api/admin/reports/hire-completions`): includes the same lookup; each history item has `taskDocumentUrl`.

### UI
In **Task Management → Hire Completions** modal:
- **Task list** (unclaimed/claimed tasks): each task row shows a “View task document” link when `taskDocumentUrl` is present; opens in a new tab.
- **History**: each history item shows the same link when `taskDocumentUrl` is present.

Existing verification records created before this feature have no linked Onboarding Tasks Logs record, so they have no document link (the UI simply does not show the link).

---

## Notes / Backfill
Existing completed tasks may not have `Completed By` populated (e.g. older records, completions done directly in Airtable, or sessions missing `userStaffId` at the time). Those will show `"-"` until the record is completed through the app with a valid admin session.

