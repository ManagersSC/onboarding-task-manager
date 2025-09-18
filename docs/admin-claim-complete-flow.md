## Admin Claim and Completion Flow

This document details how admin task claiming and completion work in the Tasks table and API.

### Key Fields (Tasks table `tblCOusVRFrciv4Ck`)
- 📌 Task: `fldBSR0tivzKCwIYX`
- 📖 Task Detail: `fld5zfFg0A2Kzfw8W`
- 🚨 Urgency: `fldwLSc95ITdPTA7j`
- 🚀 Status: `fldcOYboUu2vDASCl`
- 👩 Created By: `fldHx3or8FILZuGE2` (link to Staff)
- 👨 Assigned Staff: `fld15xSpsrFIO0ONh` (link to Staff)
- 👤 Assigned Applicant: `fldo7oJ0uwiwhNzmH` (link to Applicants)
- 📆 Due Date: `fldJ6mb4TsamGXMFh`
- Onboarding Task ID: `fldyq3GebxaY3S9oM`
- Completed Date: `flddxTSDbSiHOD0a2`
- Flagged Reason: `fldcXwC0PBEjUX9ZB`
- Claimed Date: `fldExdpb2dPzlR8zV`

### Business Rules
- Regular user completion (complete-task API): Creates a new global task with:
  - Status = In-progress
  - Assigned Applicant set
  - Assigned Staff empty
  - Claimed Date empty
- Admin claim: Sets Assigned Staff to the admin’s staff record and sets Claimed Date to now.
- Admin complete: Sets Status = Completed and clears Assigned Staff and Claimed Date.
- Unclaiming: Managed by Airtable automation (not in code).

### Server Utilities
- `claimStaffTask(taskId, userStaffId)`
  - Prevents claiming if already assigned (throws "Task already claimed").
  - Updates fields:
    - 👨 Assigned Staff = [userStaffId]
    - Claimed Date = ISO timestamp
- `completeStaffTask(taskId)`
  - Updates fields:
    - 🚀 Status = Completed
    - 👨 Assigned Staff = []
    - Claimed Date = null

### API Endpoints
- PATCH `/api/dashboard/tasks/:id` with body `{ action: "claim" }`
  - Requires `session.userStaffId` in iron-session.
  - 409 if already claimed.
- PATCH `/api/dashboard/tasks/:id` with body `{ action: "complete" }`
  - Marks task Completed and clears claim info.
- POST `/api/dashboard/tasks/claim-all`
  - Body: `{ applicantId?: string, taskIds?: string[] }`
  - Claims all unclaimed, non-completed tasks linked to an applicant, or a specified list.
  - Returns `{ claimed: string[], alreadyClaimed: string[], errors: {ids, message}[] }`.

### Frontend (Admin TaskManagement)
- Claim single: Uses the claim action via PATCH `tasks/:id`.
- Claim all (to be wired): Call POST `tasks/claim-all` with the selected applicant.
- Complete: Uses the complete action via PATCH `tasks/:id` and reflects removal from active lists.

### Notes
- Due Date remains optional.
- Use field IDs in places where emoji field names caused API issues (e.g., complete-task route). For admin claim/complete, plain field names are used for readability and align with existing code paths.


