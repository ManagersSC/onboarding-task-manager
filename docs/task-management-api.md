# Dashboard Task Management API

## Overview
This document describes the implementation of the dashboard task management API, which provides task data for the admin dashboard. The API fetches and transforms data from the Airtable-like schema, joining with the Staff table to provide creator information, and groups tasks by status for efficient dashboard rendering.

## Endpoint Structure

- **Path:** `/api/dashboard/tasks/`
- **File:** `src/app/api/dashboard/tasks/route.js`
- **Method:** `GET` (only GET is implemented for now)

## Data Source

- **Schema:** Airtable-like JSON schema located at `docs/ATS_schema`
- **Tables Used:**
  - `Tasks`: Contains all task records
  - `Staff`: Used to resolve the creator's name
  - `Applicants`: Used to resolve the applicant's name (for the 'For:' field)

## Data Transformation Logic

- Each task is joined with the Staff table to get the creator's name (shown as 'Created by:')
- The 'For:' field only shows the applicant's name (no department)
- Tasks are grouped by status for the dashboard tabs:
  - `upcoming` (includes 'Today' and 'In-progress')
  - `overdue`
  - `blocked`
  - `completed`
- The department is **not** included in the 'For:' field
- The field 'Assigned to:' is replaced with 'Created by:'

## Example Response

```json
{
  "tasks": {
    "upcoming": [
      {
        "id": "ID-12345",
        "title": "Schedule welcome meeting",
        "description": "...",
        "dueDate": "2024-06-10",
        "priority": "high",
        "status": "today",
        "createdBy": "Jane Doe",
        "for": "Sarah Chen",
        "blockedReason": ""
      }
    ],
    "overdue": [ ... ],
    "blocked": [ ... ],
    "completed": [ ... ]
  }
}
```

## Implementation Details

- **API Handler:**
  - Located at `src/app/api/dashboard/tasks/route.js`
  - Calls `getTasksWithCreator()` from `src/lib/dashboard-tasks.js`
  - Returns grouped and transformed task data as JSON

- **Data Logic:**
  - Implemented in `src/lib/dashboard-tasks.js`
  - Parses the ATS schema, finds relevant tables, and maps/joins records
  - Handles missing or incomplete data gracefully

## Extending the API

- To add PATCH/POST/DELETE support, extend the API handler in `route.js`
- To support additional fields or filtering, update the transformation logic in `dashboard-tasks.js`
- For real database integration, replace the schema import and record mapping with actual DB queries

## Error Handling

- Returns HTTP 500 with error details if data fetching or transformation fails
- Returns HTTP 405 for unsupported methods

## Next Steps

- Implement PATCH/POST/DELETE for task management
- Integrate with a real database or Airtable API
- Add authentication and authorization as needed

## GET /api/admin/dashboard/current-user

**Purpose:**
Returns the current authenticated user's Staff record ID and name, as stored in the session cookie. This is used to pre-fill the "Created By" field when creating a new task, ensuring the correct Airtable linked record is used.

**Authentication:**
- Requires a valid session cookie (set by the login route).
- Returns 401 if not authenticated or session is invalid.

**Response:**
- `200 OK` with JSON body:
  ```json
  {
    "id": "recXXXXXXXXXXXXXX", // Airtable Staff record ID
    "name": "John Doe"         // Staff name
  }
  ```
- `401 Unauthorized` if not authenticated or session is invalid.
- `500 Internal Server Error` on unexpected errors.

**Example Usage (Frontend):**
```js
fetch('/api/admin/dashboard/current-user')
  .then(res => {
    if (!res.ok) throw new Error('Not authenticated');
    return res.json();
  })
  .then(data => {
    // data.id = Staff record ID
    // data.name = Staff name
  });
```

**Typical Use Case:**
- When opening the new task modal, call this endpoint to get the current user's Staff record ID and name.
- Display the name in the UI (uneditable).
- Use the record ID when creating a new task in Airtable (for the "Created By" linked field).

## PATCH /api/dashboard/tasks/[id]

This endpoint allows updating a task by its ID. Supported actions include marking a task as complete, blocking, or deleting it.

### Completing a Task
- **Action:** `complete`
- **Description:** Marks the specified task as completed in Airtable.
- **Implementation:**
  - The backend now correctly updates the `Tasks` table in Airtable (previously, it incorrectly updated the `Staff` table).
  - The PATCH handler awaits the completion of the Airtable update before responding.
- **Frontend:**
  - After a task is marked as complete, the task list is automatically refreshed to reflect the change in the UI.

### Example Request
```js
fetch('/api/tasks/<taskId>', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'complete' })
})
```

### Example Response
```json
{
  "success": true
}
```

---

## completeStaffTask(taskId)

- Updates the `🚀 Status` field to `Completed` for the given task in the `Tasks` table in Airtable.
- Throws an error if Airtable environment variables are missing.

---

## Changelog
- **2024-06-08:** Fixed bug where task completion updated the wrong table. Now updates the `Tasks` table and refreshes the UI after completion. 