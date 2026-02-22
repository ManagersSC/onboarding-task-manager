# TASK: Fix Assigned Tasks Page — Mobile Responsiveness & Header

**Branch:** `fix/assigned-tasks-mobile-header`
**Description:** Fix the broken page header text ("Onboarding AssignedTasks") and make the table horizontally scrollable on mobile so column values no longer overlap.

## Sub-tasks

- [x] Fix page header: "Onboarding AssignedTasks" → "Assigned Tasks"
- [x] Wrap table container in `overflow-x-auto` to enable horizontal scroll on mobile
- [x] Add `min-w-[1440px]` to the Table to prevent column squishing
- [x] Add `truncate` to name, email, and title cells to prevent text overflow
