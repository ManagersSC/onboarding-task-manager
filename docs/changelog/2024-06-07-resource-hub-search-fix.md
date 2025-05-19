# Changelog: Resource Hub API Search Fix

**Date:** 2024-06-07

## Summary
- Fixed the file search functionality in the Resource Hub API endpoint (`/api/admin/dashboard/resource-hub`).
- The API now filters files by filename using the search query (case-insensitive).
- Only files whose names match the search query are returned (up to 5 results).
- This ensures the Resource Hub dashboard displays only relevant files when searching.

---

**Impact:**
- Users will now see only files matching their search input, improving usability and accuracy of the Resource Hub. 