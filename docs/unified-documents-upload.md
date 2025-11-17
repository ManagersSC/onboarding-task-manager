## Unified Documents Upload (Applicants + Documents)

### What changed
- The Documents dropdown in `components/admin/users/applicant-drawer.js` now includes attachment fields from both:
  - Applicants table: `CV`, `Portfolio of Cases`, `Testimonials`, `Reference 1`, `Reference 2`, `DISC PDF`, `Appraisal Doc`
  - Documents table: `Passport`, `GDC Registration Certificate`, `Qualification Certificate`, `DBS`, `Indemnity Insurance`, `Hep B Immunity Record`, `CPD Training Certificates`, `Profile Photo`, `Before`, `After`, `Basic Life Support Training`, `P45`, `New Starter Information and Next of Kin Document`, `Other Documents`

### Routing
- Uploads are sent to the correct backend automatically:
  - Applicants fields → `POST /api/admin/users/:id/attachments`
  - Documents fields → `POST /api/admin/users/:id/documents/attachments`

### Backend
- New API: `POST /api/admin/users/:id/documents/attachments`
  - Auth: Admin only
  - Finds the existing `Documents` record linked to the applicant or creates one if missing (links via `Applicants`).
  - Uploads files to the specified field on the Documents record using Airtable's content API.
  - Uses `logAuditEvent` with a detailed message.

### Data model references (ATS_schema.txt)
- Applicants (attachments): `CV`, `Portfolio of Cases`, `Testimonials`, `Reference 1`, `Reference 2`, `DISC PDF`, `Appraisal Doc`
- Documents (attachments): `Passport`, `GDC Registration Certificate`, `Qualification Certificate`, `DBS`, `Indemnity Insurance`, `Hep B Immunity Record`, `CPD Training Certificates`, `Profile Photo`, `Before`, `After`, `Basic Life Support Training`, `P45`, `New Starter Information and Next of Kin Document`, `Other Documents`

### UI behavior
- Selecting any type reveals an upload dropzone.
- After successful upload, the applicant is refreshed (`mutate()`), so newly added files appear in the consolidated grid (which already shows both Applicants and Documents attachments).

### Dynamic list source
- The dropdown is generated dynamically by `GET /api/admin/users/attachments/fields`, which parses `docs/ATS_schema.txt` and returns:
  - `core`: attachment fields from the `Applicants` table (displayed under “Core”)
  - `documents`: attachment fields from the `Documents` table (displayed under “Documents”)


