# TASK: Fix Bulk Delete Duplicate Requests

**Branch:** `fix/bulk-delete-duplicate-requests`

**Problem:** Mass-deleting tasks causes duplicate DELETE requests per task — the first request succeeds (200) and a second identical one immediately fails (500 — "record not found"), leaving error toasts for tasks that were actually deleted successfully.

**Root causes:**
- `deleteTask` reads `tasks` from a stale render closure; each call in the loop uses the original snapshot
- `bulkDelete` has no deduplication or in-progress guard, so duplicate IDs or re-triggers cause double API calls
- `deleteStaffTask` (server) throws on "record not found", making the API non-idempotent on delete

---

## Sub-tasks

- [x] Fix `deleteTask` stale closure — use functional `setTasks` updater
- [x] Add deduplication to `bulkDelete` — collect unique IDs before iterating
- [x] Add in-progress guard to `bulkDelete` — prevent double-clicks
- [x] Make `deleteStaffTask` idempotent — treat "record not found" as success (200)
