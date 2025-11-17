## Monthly Review Deletion

### Overview
- Admins can now delete a scheduled Monthly Review from the applicant drawer.
- Deletion is only allowed for reviews in a "Scheduled" state (i.e., with no uploaded documents).
- Actions are audit-logged to Airtable and surfaced with sonner notifications in the UI.

### UI Behavior
- Location: `components/admin/users/applicant-drawer.js`, section "Monthly Review".
- For scheduled entries:
  - Shows a "Scheduled" badge, an "Upload" button, and a delete icon button (X).
  - Clicking the delete icon opens a confirmation modal:
    - Confirming deletes the review and shows `toast.success("Scheduled review deleted")`.
    - Errors show `toast.error(...)`.
- After deletion, the applicant data is refreshed via `mutate()` so the list updates immediately.

### API
- Route: `DELETE /api/admin/users/:id/monthly-reviews/:reviewId`
- Auth: Admin only (via cookie session).
- Validation:
  - Ensures the `reviewId` belongs to the applicant `:id`.
  - Disallows deleting completed reviews (those with any `Docs`).
- Response:
  - 200: `{ success: true, reviewId, applicantId }`
  - 400/401/500 with `{ error: string }`

### Audit Logging
- Uses `logAuditEvent` with the incoming request:
  - `eventType`: "Monthly Review Deleted"
  - `eventStatus`: "Success"
  - `detailedMessage`: Includes `reviewId`, `title`, `period`, and applicant id.

### Notes
- Calendar events (if created on schedule) are currently not deleted automatically because the event id is not persisted to Airtable. This can be extended later by storing the Calendar event id on the Monthly Review and removing it as part of deletion.


