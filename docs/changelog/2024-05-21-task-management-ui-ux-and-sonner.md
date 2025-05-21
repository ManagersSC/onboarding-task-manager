# [2024-05-21] - Task Management UI/UX and Sonner Notification Improvements

## Changes
- Replaced the dropdown menu in Task Management with Pencil (edit) and Trash (delete) icons from lucide-react.
- Added custom reddish hover highlight to the Trash button.
- Implemented a smart delete with undo (Sonner toast) pattern: deletion is only finalized after the toast disappears, with an Undo option.
- Added a GET handler to the API for fetching a single task's details.
- Improved the Edit Task dialog:
  - Save Changes button and Unsaved Changes badge now use more visually appealing colors and are better positioned.
  - The Unsaved Changes badge is now inline with the Edit Task title.
  - Integrated the custom calendar popover for due date selection (matching the new task modal).
  - Fixed date parsing and status mapping issues.
  - Status dropdown now includes Overdue and removed Pending.
  - Staff assignment now uses a Select dropdown and sends the correct staff ID to Airtable.
- Added Sonner toast notifications for all major actions: task completion, editing, deletion (with undo), and creation, with clear success/error messages.

## Technical Details
- Refactored PATCH and DELETE API handlers to support audit logging and correct field mapping.
- Fixed issues with date and status values sent to Airtable.
- Improved error handling and user feedback throughout the UI.

## Testing Notes
- All major task actions now show Sonner toasts.
- Task editing, deletion (with undo), and creation tested for correct API and UI behavior.
- No more invalid status or staff errors when editing tasks.
- UI/UX improvements verified in the Edit Task dialog and task list. 