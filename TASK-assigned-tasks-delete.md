# TASK: Add Delete to Assigned Tasks

**Branch:** `feat/assigned-tasks-delete`
**Description:** Add single-record and bulk delete functionality to admin/assigned-tasks, mirroring the resources page pattern. Includes checkbox selection, bulk delete bar, and a delete button in the edit drawer.

## Sub-tasks

- [x] Add `DELETE` handler to `/api/admin/tasks/assigned-tasks/[id]/route.js`
- [x] Create `/api/admin/tasks/assigned-tasks/bulk-delete/route.js`
- [x] Update `DynamicTaskEditSheet.js` — add optional `onDelete` prop + delete button
- [x] Update `AssignedTasksLogsTable.js` — checkbox column, selection state, bulk-delete bar, wire sheet delete
- [x] Update `AssignedTasksLogsPage.js` — lift selection state
