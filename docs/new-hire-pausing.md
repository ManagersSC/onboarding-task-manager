## New Hire Pausing Feature

This document explains the pausing/resuming functionality for new hire onboarding in the admin dashboard.

### API

- Endpoint: `POST /api/admin/dashboard/new-hires/[id]/pause-onboarding`
- Auth: Admin session required. The server derives the acting Staff member from the session (never from client input).

Request bodies:

- Pause:
```json
{
  "action": "pause",
  "reason": "schedule change (optional)",
  "resumeOnDate": "YYYY-MM-DD (optional)"
}
```
- Resume:
```json
{ "action": "resume" }
```

Response (success):
```json
{
  "success": true,
  "message": "Onboarding paused | Onboarding resumed",
  "record": {
    "id": "recXXXX",
    "onboardingPaused": true,
    "pausedAt": "2025-09-23T09:42:00.000Z",
    "pausedReason": "schedule change",
    "resumedAt": null,
    "resumedOnDate": "2025-09-30",
    "pausedByName": "Admin Name",
    "resumedByName": null
  }
}
```

Errors: `{ success: false, error: string }` with appropriate HTTP status.

### Airtable Field Mapping (Applicants)

- `Onboarding Paused` (checkbox)
- `Onboarding Paused By` (link to Staff)
- `Onboarding Paused At` (dateTime)
- `Onboarding Paused Reason` (long text)
- `Onboarding Resumed At` (dateTime)
- `Onboarding Resumed By` (link to Staff)
- `Onboarding Resumed On` (date)

Behavior:
- Pause sets: Paused=true, Paused At=now, Paused By=current admin, and optionally Resumed On, Paused Reason.
- Resume sets: Paused=false, Resumed At=now, Resumed By=current admin.
- Audit logging is written to `Website Audit Log` with actor details.

### UI Behavior (`components/dashboard/NewHireTracker.js`)

- Cards now show a pause/resume button next to the name.
  - Active: pause button opens a confirmation, then a form with optional Resume Date and Reason.
  - Paused: resume button resumes immediately after confirm.
- When paused, a status line appears: “Paused by {name} at {HH:mm} — Reason: {reason}”.
- When active (and history available), show subtle meta: “Last paused by {name} • Resumed by {name} at {HH:mm}”.

### Notes

- The server derives the acting Staff record from the session (`userStaffId`).
- The new hires list API now includes pausing-related fields, so the tracker renders correct status on load.


