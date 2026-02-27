# Task: Fix Task View Drawer — Creator Name & Created Date

**Branch:** `fix/task-view-clean-up`

## Problem
- The "Created By" field in the task details drawer shows the raw Airtable record ID instead of the person's name. This happens because `createdBy` is a linked record ID but the frontend `staff` list only contains admin users (filtered by `{isAdmin}=1`), so non-admin creators are never resolved.
- A new "Created Date" field was added to the Airtable Tasks table and needs to be surfaced in the drawer.

## Sub-tasks

- [ ] Add `"Created Date"` to the fields list in the tasks API GET query
- [ ] Resolve `createdBy` IDs → names via a Staff table lookup in the API (same pattern as `applicantNameById`)
- [ ] Add `createdByName` and `createdDate` to the mapped task response
- [ ] Update the task details drawer to use `task.createdByName` instead of `getStaffName(task.createdBy)`
- [ ] Add a "Created Date" row to the task details drawer
