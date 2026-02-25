# Bulk Create Resources

Allows administrators to create multiple onboarding resources at once from **Admin → Resources → Create Resource → Bulk Resources**.

## Interface

- **Add Row / Add 5 Rows**: Add resource form rows
- **Clear All**: Remove all rows
- **Show Summary**: Toggle a preview of all resources before submitting

### Form Fields

| Field | Required | Notes |
|-------|----------|-------|
| Task Name | ✅ | Resource title |
| Description | ❌ | Optional detail |
| Week | ✅ | 0–5 |
| Day | ✅ | 0–5 |
| Medium Type | ✅ | Doc, Video, G.Drive, Quiz, Custom, Managers |
| Resource Link | ✅ | Must be a valid URL (e.g. `https://...`) |

**Smart features**: Week/Day auto-increment, copy-from-previous-row, per-row delete, real-time validation that re-enables the create button as errors are resolved.

## API

```
POST /api/admin/tasks/bulk-create
```

**Auth**: Admin session required.

**Request body:**
```json
{
  "resources": [
    {
      "taskName": "Company Handbook",
      "taskDescription": "Optional description",
      "taskWeek": 1,
      "taskDay": 1,
      "taskMedium": "Doc",
      "taskLink": "https://example.com/handbook"
    }
  ],
  "testMode": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "2 resources created successfully",
  "createdIds": ["rec123", "rec456"],
  "failedResources": [],
  "testMode": false
}
```

**Error responses:**
- `400` — Validation error (missing/invalid fields)
- `401` — Not authenticated or not admin
- `500` — Server/Airtable error

## Airtable Mapping

Target table: **Onboarding Tasks** (`tblPakqoPLP632suo`)

| Form Field | Airtable Field | Type |
|------------|----------------|------|
| taskName | Task | singleLineText |
| taskDescription | Task Body | multilineText |
| taskWeek | Week Number | singleSelect |
| taskDay | Day Number | singleSelect |
| taskMedium | Type | singleSelect |
| taskLink | Link | url |

Auto-populated: `Created By` (current user name), `Created Date` (timestamp).

## Test Mode

Set `testMode: true` in the request body to simulate creation without writing to Airtable. A test endpoint is also available:

```
POST /api/admin/tasks/bulk-create/test
```

Validates the API connection and field structure without creating records.

## Behaviour Notes

- Resources are processed sequentially to respect Airtable rate limits.
- On successful submission, the form clears all local state and session storage.
- On failure, local state is preserved so the user can retry or correct data.
- Auto-save runs every 3 seconds while the form is open.
- Audit-logged on success; test mode operations are excluded from audit logs.

## Key Files

- `components/tasks/BulkCreateResourcesForm.js` — Form UI and validation
- `components/tasks/CreateTaskDialog.js` — Parent dialog
- `src/app/api/admin/tasks/bulk-create/route.js` — API endpoint
