# TASK: Add Delete to Assigned Tasks

**Branch:** `feat/assigned-tasks-delete`
**Description:** Add single-record and bulk delete functionality to admin/assigned-tasks, mirroring the resources page pattern. Includes checkbox selection, bulk delete bar, and a delete button in the edit drawer.

## Sub-tasks

- [ ] Add `DELETE` handler to `/api/admin/tasks/assigned-tasks/[id]/route.js`
- [ ] Create `/api/admin/tasks/assigned-tasks/bulk-delete/route.js`
- [ ] Update `DynamicTaskEditSheet.js` — add optional `onDelete` prop + delete button
- [ ] Update `AssignedTasksLogsTable.js` — checkbox column, selection state, bulk-delete bar, wire sheet delete
- [ ] Update `AssignedTasksLogsPage.js` — lift selection state
