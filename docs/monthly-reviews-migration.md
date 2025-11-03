# Monthly Reviews: schema and implementation

## Overview
Monthly Reviews are now modeled as first-class records in the `Monthly Reviews` table, linked to `Applicants`. Each monthly review row represents one review period and may contain an uploaded document when completed.

## ATS schema (relevant)
- Applicants
  - Monthly Reviews (linked) → `tblfGMjLxwu8VKKgi`
- Monthly Reviews
  - Id (formula): `MR-` + record id
  - Applicant (link to Applicants)
  - Period (YYYY-MM)
  - Title (text)
  - Start (dateTime)
  - End (dateTime)
  - Docs (attachments)

## API changes
- Schedule Monthly Review
  - POST `/api/admin/users/:id/monthly-review`
  - Body: `{ date: 'YYYY-MM-DD', startTime?: 'HH:mm', endTime?: 'HH:mm', title: string }`
  - Behavior: creates a record in `Monthly Reviews` with `Applicant`, `Title`, `Period` (derived from `date`), optional `Start`/`End`.
  - Response: `{ success: true, reviewId, period, date, startTime, endTime, title }`

- Upload Monthly Review Document
  - POST `/api/admin/users/:id/monthly-reviews/:reviewId/docs`
  - Body: `multipart/form-data` with `files[]` and optional `title` (used as filename)
  - Behavior: uploads to `Monthly Reviews.Docs` for the given `reviewId`.

## Applicant detail payload
- `applicant.monthlyReviews: Array<{ id, title, period, start, end, docs[], hasDocs }>`

## UI changes
- New Review modal
  - Schedule creates Monthly Review (and optionally the Google Calendar event in the UI).
  - Upload flow: if invoked directly, it first creates a Monthly Review (period derived from the input title) and then uploads the document to that review.
- List rendering (scheduled vs completed)
  - Scheduled: `hasDocs === false` → show orange “Scheduled” + Upload
  - Completed: `hasDocs === true` → show green “Completed” + Eye (viewer)

## Migration (optional)
- If needed, parse legacy `Applicants.Monthly Review Dates` and create corresponding Monthly Review rows. Legacy `Applicants.Monthly Review Docs` should be deprecated for new data.
