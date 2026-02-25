# Monthly Reviews

Monthly reviews are first-class records in the `Monthly Reviews` Airtable table, linked to `Applicants`. Each record represents one review period and may hold an uploaded document when completed.

## Airtable Schema

**Monthly Reviews table** (`tblfGMjLxwu8VKKgi`):

| Field | Type | Description |
|-------|------|-------------|
| Id | Formula | `MR-` + record ID |
| Applicant | Link to Applicants | Linked applicant |
| Period | Text | `YYYY-MM` format |
| Title | Text | Review title |
| Start | DateTime | Review start time |
| End | DateTime | Review end time |
| Docs | Attachments | Uploaded review documents |

**Applicants table** additions:
- `Monthly Reviews` (linked) → `tblfGMjLxwu8VKKgi`

## Task Type: "Book Monthly Reviews"

To surface a special admin task that shows a checklist of all onboarding staff:

1. Add a `Task Type` single-select field to the `Tasks` table in Airtable with choices: `Standard` (default) and `Monthly Reviews`.
2. Create a task with:
   - Title: `Book Monthly Reviews`
   - Task Type: `Monthly Reviews`
   - Assign to a staff member with a due date

When the task is claimed, clicking it opens a **Book Monthly Reviews** modal listing all people currently onboarding (`onboardingStarted === true` OR `onboardingStatus === "Onboarding"`). The modal is non-destructive and does not persist selections.

## API Endpoints

### Schedule a review
```
POST /api/admin/users/:id/monthly-review
Body: { date: 'YYYY-MM-DD', startTime?: 'HH:mm', endTime?: 'HH:mm', title: string }
Response: { success: true, reviewId, period, date, startTime, endTime, title }
```

### Upload a review document
```
POST /api/admin/users/:id/monthly-reviews/:reviewId/docs
Body: multipart/form-data with files[] and optional title
```

### Delete a scheduled review
```
DELETE /api/admin/users/:id/monthly-reviews/:reviewId
```
- Only allowed for **scheduled** reviews (no uploaded documents yet).
- Returns `{ success: true, reviewId, applicantId }`.
- Audit-logged as "Monthly Review Deleted".

> **Note:** If a Google Calendar event was created when scheduling, it is **not** automatically deleted — the Calendar event ID is not currently persisted to Airtable. This can be extended by storing the event ID on the Monthly Review record.

## UI Behavior

In the applicant drawer → Monthly Reviews section:

| State | Badge | Actions |
|-------|-------|---------|
| Scheduled (`hasDocs === false`) | Orange "Scheduled" | Upload button, Delete (X) icon |
| Completed (`hasDocs === true`) | Green "Completed" | Eye icon (view document) |

Clicking the delete icon opens a confirmation modal. After deletion, the applicant data refreshes via `mutate()`.

## Applicant Payload

```json
{
  "monthlyReviews": [
    { "id": "...", "title": "...", "period": "2025-03", "start": "...", "end": "...", "docs": [], "hasDocs": false }
  ]
}
```

## API Fields (Dashboard)

- `GET /api/dashboard/tasks` — includes `taskType` field (`Standard` or `Monthly Reviews`)
- `GET /api/dashboard/tasks/[id]` — includes `taskType`
- `POST /api/dashboard/tasks` — accepts optional `taskType`
