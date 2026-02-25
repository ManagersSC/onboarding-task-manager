# Task Management

## Overview

The dashboard `TaskManagement` component (`components/dashboard/TaskManagement.js`) provides task viewing, claiming, completing, bulk operations, and search across task tabs (Unclaimed, My Queue, Overdue, Completed).

## Features

- **Per-task overflow menu**: View details, Claim, Unclaim, Edit, Delete, Flag — actions gated by permissions
- **Bulk actions**: Select multiple tasks via row checkboxes; bulk bar offers Claim (unclaimed), Unclaim (claimed), Delete, Flag (single reason applied to all)
- **Delete with undo**: Single-task delete shows a 4-second "Undo" toast before dispatching the DELETE request
- **Enhanced search**: Matches title, description, assignee name, applicant name, flagged reason, and due date
- **Status normalization**: Internal comparisons are case/whitespace-insensitive
- **Hire Completions History**: Inside the Hire Completions modal, a History toggle shows recent verification actions (manager name, timestamp) sourced from `Completed By` and `Completed At` on the `Tasks` table

## Permissions

| Action | Who can perform |
|--------|----------------|
| Delete unclaimed tasks | Admins; task creators (`task.createdBy === currentUser`) |
| Claim tasks | Any authenticated staff member |
| Complete tasks | Assigned staff or admin |

The `canDeleteTask(task)` helper encapsulates delete permission logic.

## API Endpoints

### Get tasks
```
GET /api/dashboard/tasks
```

Returns tasks grouped by status for dashboard tabs.

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
        "taskType": "Standard",
        "blockedReason": ""
      }
    ],
    "overdue": [],
    "blocked": [],
    "completed": []
  }
}
```

Tab groupings:
- `upcoming` — includes "Today" and "In-progress" statuses
- `overdue`, `blocked`, `completed`

Field `taskType` is `Standard` or `Monthly Reviews`. See [monthly-reviews.md](./monthly-reviews.md) for special behaviour.

### Claim / Complete / Delete

```
PATCH /api/dashboard/tasks/:id
Body: { "action": "claim" | "complete" }
```

```
DELETE /api/dashboard/tasks/:id
```

### Claim all

```
POST /api/dashboard/tasks/claim-all
Body: { "applicantId"?: "...", "taskIds"?: ["..."] }
Response: { "claimed": [...], "alreadyClaimed": [...], "errors": [...] }
```

### Current user (for task creation)

```
GET /api/admin/dashboard/current-user
Response: { "id": "recXXX", "name": "John Doe" }
```

Returns the session user's Staff record ID and name. Use to pre-fill the "Created By" field when creating a task in Airtable. Returns `401` if unauthenticated.

### Hire completions history

```
GET /api/admin/reports/hire-completions
Params: applicantId?, from?, to?, limit?
```

Returns recent task completion attribution records.

## Implementation Notes

- Selection state is tracked in-memory (`selectedTaskIds: Set<string>`)
- Bulk bar appears only when the active tab has selected items
- `TaskItem` is memoized; tab lists derived via `useMemo`
- Bulk claim/unclaim dispatches parallel PATCH requests

## Key Files

| File | Purpose |
|------|---------|
| `components/dashboard/TaskManagement.js` | Main component, selection state, bulk actions |
| `src/lib/utils/dashboard/tasks.js` | Completion attribution fields |
| `src/app/api/dashboard/tasks/[id]/route.js` | Claim/complete/delete handler |
| `src/app/api/admin/reports/hire-completions/route.js` | History endpoint |
