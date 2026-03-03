# TASK: View Tasks Link → Assigned Tasks Page

**Branch:** `feat/view-tasks-link-assigned-tasks`
**Description:** Change the "View Tasks" button in the New Hire Details modal to link to `/admin/assigned-tasks` with the hire's name pre-populated in the search bar.

## Sub-tasks

- [x] Update "View Tasks" link href in `NewHireTracker.js` to `/admin/assigned-tasks?search=<hireName>`
- [x] Make `AssignedTasksLogsPage` read `search` URL param via `useSearchParams` and pass as `initialSearchTerm`
- [x] Add `initialSearchTerm` prop to `AssignedTasksLogsTable` and initialise `searchTerm` state with it
- [x] Add `initialTerm` prop to `TableFilters` and initialise its local `term` state with it
