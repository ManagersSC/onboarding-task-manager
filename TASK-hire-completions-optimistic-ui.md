# TASK: Hire Completions Modal — Optimistic UI & UX Fixes

**Branch:** `fix/client-bugs-may-2026`

## Description
Fix dynamic rendering of claim/unclaim badges and buttons in the Hire Completions modal. Currently, badge and button state only updates after a hard refresh. Also improve the unclaim button icon and fix the subtitle task count.

## Sub-tasks

- [x] Create task tracking file
- [x] Add `UserMinus` to lucide-react imports
- [x] Fix claim: delay `fetchTasks()` to prevent race condition overwriting optimistic update
- [x] Fix `handleClaimAllForApplicant`: add optimistic update + delay refetch
- [x] Fix unclaim in Hire Completions modal: add immediate optimistic `setTasks` + revert on undo
- [x] Replace `X` icon with `UserMinus` for unclaim button in modal
- [x] Fix modal subtitle to count only unclaimed tasks (not all tasks)
- [ ] Commit changes