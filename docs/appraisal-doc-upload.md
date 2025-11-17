## Appraisal Document Upload (Applicants → "Appraisal Doc")

### What this adds
- Admins can attach appraisal files directly to the Airtable `Applicants` table using the `Appraisal Doc` attachment field.
- UI lives in `components/admin/users/applicant-drawer.js` → Documents tab:
  - Dropdown to choose document type (Phase 1: Appraisal Doc)
  - "Add Document" button (disabled until a type is selected)
  - Re-uses existing `UploadDropzone` with scrolling into view when opened

### How it works
1. Admin selects "Appraisal Doc" from the dropdown and clicks "Add Document".
2. The dropzone appears; admin drops or browses files.
3. Files are posted to `POST /api/admin/users/[id]/appraisal` as FormData.
4. The API uploads each file to Airtable via the Content API and appends them to the `Appraisal Doc` field of that applicant.
5. On success, the drawer refreshes and the file(s) appear in "All Documents".

### Key files
- `components/admin/users/applicant-drawer.js` (UI + client flow)
- `src/app/api/admin/users/[id]/appraisal/route.js` (server, Airtable upload)
- `src/app/api/admin/users/[id]/route.js` (adds "Appraisal Doc" to document consolidation)

### Permissions
- Restricted to `admin` via session (same as other admin APIs).

### Airtable requirements
- Base ID: `AIRTABLE_BASE_ID`
- API Key: `AIRTABLE_API_KEY`
- Applicants table must contain an attachment field named exactly `Appraisal Doc`.

### Limits & notes
- Airtable Content API accepts base64-encoded file payloads; typical single-file size should remain reasonable (<10–15 MB recommended).
- Multiple files are supported; they are appended to the existing attachments list for that field.
- Errors are returned with a generic upload failure and a detailed message in development.

### Extending the dropdown
- To add more document types, extend the dropdown in `applicant-drawer.js` and (if stored in Applicants) add the field to the `initialDocFields` array in `GET /api/admin/users/[id]` so it appears under "All Documents".


