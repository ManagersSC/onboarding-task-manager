# Monthly Reviews Task (Admin Task Management)

This document describes how to enable a special admin task that opens a modal titled “Book Monthly Reviews” with a checklist of all onboarding people.

## ATS: Tasks table changes

Add a new single-select field to the `Tasks` table in Airtable:

- Field: `Task Type`
- Type: Single select
- Choices:
  - `Standard` (default)
  - `Monthly Reviews`

Notes:
- Keep existing fields unchanged (`📌 Task`, `📖 Task Detail`, `🚨 Urgency`, `🚀 Status`, `👨 Assigned Staff`, etc.).
- This field only flags a task as special; no other schema changes are required.

After adding the field, exporting the base schema will reflect this as a new field on the `Tasks` table in `ATS_schema.txt`.

## Backend updates

Endpoints updated to surface the new field:
- `GET /api/dashboard/tasks` now includes `taskType` derived from Airtable `Task Type`.
- `GET /api/dashboard/tasks/[id]` includes `taskType`.
- `POST /api/dashboard/tasks` accepts optional `taskType` and persists it to Airtable when provided.

Field mapping:
- Airtable `Task Type` → API `taskType` (string; `Standard` or `Monthly Reviews`).

No other backend changes are required.

## Frontend behavior (TaskManagement)

When a task has `taskType === "Monthly Reviews"` and is already claimed (i.e., assigned to staff), clicking the task card opens a modal:
- Title: `Book Monthly Reviews`
- Content: checklist of people currently onboarding.

Data source for onboarding people:
- `GET /api/admin/dashboard/new-hires` → returns `newHires` with fields including `onboardingStarted` and `onboardingStatus`.
- The UI filters to people where `onboardingStarted === true` OR `onboardingStatus === "Onboarding"`.

UI details:
- The modal is non-destructive and does not persist selections (can be extended later to trigger bookings).
- Other tasks are unaffected; only `Monthly Reviews` tasks receive the click-to-open behavior once claimed.

## Creating a Monthly Reviews task

When creating a task via the admin UI or API, set:
- Title: `Book Monthly Reviews`
- `Task Type`: `Monthly Reviews`
- Assign to a staff member and set an appropriate due date/urgency.

This ensures the task appears in Task Management and behaves with the special modal behavior after being claimed.
