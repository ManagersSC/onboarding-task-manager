# Fix ATS Schema File Extension

**Branch:** `fix/ats-schema-file-extension`

The `/api/admin/users/attachments/fields` endpoint reads `ATS_schema.txt` but the actual file is `ATS_schema.json`, causing a 500 error on the admin/users page.

## Sub-tasks

- [x] Fix file extension from `.txt` to `.json` in the API route
