## Task Management UI updates

### Overview
This update streamlines actions across Unclaimed and My Queue, adds bulk actions, and improves search and status handling in `components/dashboard/TaskManagement.js`.

### Key changes
- **Consistent overflow menu**: All tasks now have a three-dots menu. Unclaimed tasks include View details, Claim, and Delete (permission-gated). Claimed tasks retain existing actions.
- **Delete on Unclaimed**: Admins or the creator can delete unclaimed tasks directly from the Unclaimed tab (no need to claim first). Uses the existing delete confirmation dialog.
- **Bulk actions**: You can multi-select tasks via row checkboxes. A compact bar appears to perform Claim and Delete on the selected items. Use Clear to reset selection.
- **Status normalization**: Internal comparisons use a normalized value so statuses are handled consistently regardless of spacing/case.
- **Enhanced search**: Search now matches title, description, assignee name, applicant name, flagged reason, and due date string.
- **Accessibility**: Icon buttons have `aria-label`/`title` attributes.

### Permissions
- Delete is allowed for:
  - Admins (component is used in admin dashboard context)
  - Task creator (`task.createdBy` equals the current user)

### How to use
- Select tasks with the checkbox at the start of each row.
- Use the top bulk bar for Claim/Delete, or the per-row overflow menu for item-level actions.
- You can still use the inline primary action buttons (Claim/Complete) and the Flag button.

### Implementation notes
- Selection state is tracked in-component (`selectedTaskIds: Set<string>`).
- The bulk bar appears only when the current tab has selected items.
- The existing delete API (`DELETE /api/dashboard/tasks/:id`) is reused.

### File touched
- `components/dashboard/TaskManagement.js`

If you need confirmations for bulk delete, consider integrating `components/tasks/BulkDeleteTasksModal.jsx` in a follow-up. 
## Task Management – streamlined UX

This document summarizes the recent UX and logic improvements to the dashboard `TaskManagement` component (`components/dashboard/TaskManagement.js`).

### What changed

- Consistent overflow menu on every task row
  - Unclaimed (global) tasks now show a three-dots menu with: View details, Claim, and Delete (when permitted).
  - Claimed tasks keep the existing menu: View details, Edit, Unclaim, Delete.
- Delete for unclaimed tasks
  - Allowed for admins and task creators. Confirmation dialog includes a 4s “Undo” grace window before the delete request is sent.
- Bulk actions
  - Added row selection checkboxes and a sticky bulk actions bar when 1+ tasks are selected.
  - Actions: Claim (unclaimed only), Unclaim (claimed only), Delete (via existing `BulkDeleteTasksModal`), Flag (prompts for a single reason and applies to all selected).
- Search and status quality
  - Search now matches title, description, assignee name, applicant name, flagged reason, and raw due date.
  - Status handling is normalized to avoid brittle string checks.
- Performance and accessibility
  - `TaskItem` is memoized; tab lists are derived via `useMemo`.
  - Added `aria-label` and `title` to key icon buttons/menus.

### Permissions

- Deleting unclaimed tasks:
  - Admins can delete all tasks.
  - Task creators can delete their own tasks.
  - The helper `canDeleteTask(task)` encapsulates this logic (temporary until full roles are wired).

### Bulk actions details

- Selection state is tracked in-memory; clearing the selection dismisses the bulk bar.
- Bulk delete uses `components/tasks/BulkDeleteTasksModal.jsx` and refreshes after completion.
- Bulk claim/unclaim dispatches parallel requests to `/api/dashboard/tasks/:id` with `PATCH` actions.

### Key code touchpoints

- Row actions and menus are implemented in `TaskItem`.
- Bulk bar and selection state live in `TaskManagement` along with helpers:
  - `canDeleteTask`, `normalizeStatus`, `filteredTasks` (expanded).
  - `bulkClaim`, `bulkUnclaim`, `bulkFlag`.

### Rollback

- Deleting from the single-item dialog presents an “Undo” toast for 4 seconds prior to dispatching the DELETE request.

### Follow-ups (optional)

- Replace the internal tab value `"upcoming"` with `"unclaimed"` to reduce confusion.
- Wire a proper role provider so `isAdminUser` can be sourced from session/auth.

