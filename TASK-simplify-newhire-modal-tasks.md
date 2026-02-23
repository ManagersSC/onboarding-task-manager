# TASK: Simplify New Hire Modal — Remove Task List, Keep See More Button

**Branch:** fix/see-more-task-button
**Description:** Remove the "Upcoming Tasks" list from the NewHireTracker modal and replace it with a standalone, visually appealing "View Tasks" button.

## Sub-tasks

- [x] Remove the "Upcoming Tasks" section (task list, loading skeleton, hasMore indicator, container)
- [x] Replace with a standalone, visually appealing "View Tasks" button linking to `/admin/users?applicantId=${hire.id}`
- [x] Clean up unused state (`hireTasks`, `hireTasksLoading`), `fetchHireTasks` function, and its `useEffect`
- [x] Remove unused imports — `useCallback` retained (still used by `handleKeyDown`), `ListTodo` retained (used in new button)
