# Fix Attachment Fields API — Use Airtable Meta API with Field IDs

**Branch:** `fix/ats-schema-file-extension`

Replace the static file read of `ATS_schema.json` with a live call to the Airtable Meta API, returning field IDs instead of field names.

## Sub-tasks

- [x] Rewrite `/api/admin/users/attachments/fields` route to call Airtable Meta API
- [x] Update `applicant-drawer.js` to use `fieldId` instead of `fieldName`
- [x] Update upload endpoints to accept/use field IDs
