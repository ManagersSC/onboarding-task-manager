# Admin Workflows

## Admin Invite Flow

Admins can invite new admin accounts from **Admin → Profile → Create Admin**.

### Flow

1. Admin submits name and email via the profile UI (guarded confirmation dialog)
2. Server upserts a record in Airtable `Staff` with `IsAdmin = true` and empty `Password`
3. Server generates a 24-hour JWT invite token (`type: "admin_invite"`, payload: `{ staffId, email }`)
4. Make.com webhook (`MAKE_WEBHOOK_URL_ADMIN_PASSWORD_PAGE`) sends the invite email with a password-setup link
5. Invitee opens the link at `/accept-admin-invite?token=...`, sets a password, and can log in

### Endpoints

**`POST /api/admin/invite-admin`** — Requires admin session cookie
```json
Body: { "name": "Jane Doe", "email": "jane@example.com" }
Response: { "message": "Invite sent", "staffId": "recXXX" }
```

**`POST /api/admin/accept-invite`**
```json
Body: { "token": "...", "password": "...", "confirmPassword": "..." }
```
Verifies the JWT and updates the `Staff` record with a bcrypt-hashed password.

### Environment Variables Required

- `MAKE_WEBHOOK_URL_ADMIN_PASSWORD_PAGE`
- `JWT_SECRET`
- `SESSION_SECRET`
- `AIRTABLE_API_KEY`
- `AIRTABLE_BASE_ID`

### Airtable Requirements

`Staff` table must have fields: `Name`, `Email`, `Password`, `IsAdmin`.

All actions are audit-logged to `Website Audit Log` (`User` type for invite/accept, `Server` type for errors).

---

## Task Claim and Complete Flow

Describes how admin tasks are claimed and completed in the `Tasks` table.

### Key Airtable Fields (Tasks table `tblCOusVRFrciv4Ck`)

| Field | Field ID |
|-------|----------|
| Task (📌) | `fldBSR0tivzKCwIYX` |
| Task Detail (📖) | `fld5zfFg0A2Kzfw8W` |
| Urgency (🚨) | `fldwLSc95ITdPTA7j` |
| Status (🚀) | `fldcOYboUu2vDASCl` |
| Created By (👩) | `fldHx3or8FILZuGE2` (link to Staff) |
| Assigned Staff (👨) | `fld15xSpsrFIO0ONh` (link to Staff) |
| Assigned Applicant (👤) | `fldo7oJ0uwiwhNzmH` (link to Applicants) |
| Due Date (📆) | `fldJ6mb4TsamGXMFh` |
| Completed Date | `flddxTSDbSiHOD0a2` |
| Claimed Date | `fldExdpb2dPzlR8zV` |

### Business Rules

| Action | What happens |
|--------|-------------|
| Regular user completes task | Creates global task: Status = In-progress, Assigned Applicant set, Assigned Staff empty, Claimed Date empty |
| Admin claims task | Sets Assigned Staff = admin's record, Claimed Date = now |
| Admin completes task | Status = Completed, clears Assigned Staff and Claimed Date |
| Unclaiming | Managed by Airtable automation (not in code) |

### API Endpoints

**Claim a task:**
```
PATCH /api/dashboard/tasks/:id
Body: { "action": "claim" }
```
- Requires `session.userStaffId`
- Returns `409` if already claimed

**Complete a task:**
```
PATCH /api/dashboard/tasks/:id
Body: { "action": "complete" }
```

**Claim all unclaimed tasks for an applicant:**
```
POST /api/dashboard/tasks/claim-all
Body: { "applicantId"?: "...", "taskIds"?: ["..."] }
Response: { "claimed": [...], "alreadyClaimed": [...], "errors": [...] }
```

### Notes

- Due Date is optional.
- Use field IDs where emoji field names cause Airtable API issues.
- For admin claim/complete, plain field names are used for readability.
