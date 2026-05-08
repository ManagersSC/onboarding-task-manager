# Admin Workflows

## Admin Invite Flow

Admins can invite new admin accounts from **Admin → Profile → Create Admin**.

### Flow

1. Admin submits name and email via the profile UI (guarded confirmation dialog).
2. Server upserts a record in Airtable `Staff` with `IsAdmin = true` and empty `Password`.
   - If the email already has an admin account with a password set → **400 "User already has an admin account"**.
   - If the email exists but has no password → the record is reused (re-invite). The `Name` field is updated in case it changed.
   - If the email is new → a fresh `Staff` record is created. If the Make.com webhook fails, the record is **rolled back** (deleted) so Airtable is not left in a partial state.
3. Server generates a one-time UUID **`Invite Nonce`**, stores it on the Staff record, and signs a 24-hour JWT: `{ staffId, email, type: "admin_invite", nonce }`.
4. Make.com webhook (`MAKE_WEBHOOK_URL_ADMIN_PASSWORD_PAGE`) sends the invite email with a link to `/accept-admin-invite?token=...`.
5. Invitee opens the link. The page decodes the JWT client-side on load and shows an **"expired"** warning if the token is older than 24 hours — before the user fills in the form.
6. Invitee sets a password (8+ chars, special char required, no consecutive sequences) and submits.
7. Server verifies the JWT signature, checks `type === "admin_invite"`, matches the nonce against Airtable (replay protection), bcrypt-hashes the password, updates the `Staff` record, clears the nonce, and creates an iron-session cookie.
8. Invitee is redirected to `/admin/dashboard` — already logged in.

> **Invite links are single-use.** If the same link is opened after the password has been set, the server returns "This invite has already been accepted". Re-inviting an address generates a new nonce, silently invalidating the old link.

### Endpoints

**`POST /api/admin/invite-admin`** — Requires admin session cookie
```json
Body:     { "name": "Jane Doe", "email": "jane@example.com" }
Success:  { "message": "Invite sent", "staffId": "recXXX" }
Error:    { "error": "..." }  (400 already configured, 502 webhook failed)
```

**`POST /api/admin/accept-invite`** — Public (no session required)
```json
Body: { "token": "...", "password": "...", "confirmPassword": "..." }
```
Verifies JWT, validates nonce, hashes password, creates session. Returns `{ redirect: "/admin/dashboard" }`.

### Environment Variables Required

- `MAKE_WEBHOOK_URL_ADMIN_PASSWORD_PAGE`
- `JWT_SECRET`
- `SESSION_SECRET`
- `AIRTABLE_API_KEY`
- `AIRTABLE_BASE_ID`
- `NEXT_PUBLIC_APP_URL` (used to build the invite link; falls back to `APP_BASE_URL` if set)

### Airtable Requirements

`Staff` table must have fields: `Name`, `Email`, `Password`, `IsAdmin`, **`Invite Nonce`** (Single line text).

All actions are audit-logged to `Website Audit Log` (`User` type for invite/accept, `Server` type for errors).

### Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| "User already has an admin account" | Email was already onboarded | Use "Forgot password?" on the admin login if they need access |
| Invite email not received | Make.com scenario paused or Gmail disconnected | Check Make.com; the server returns a 502 with the Make error detail if it fails |
| "Invalid or expired token" on accept page | Link older than 24h, or re-invite was sent (old link invalidated) | Admin resends the invite — the UI toast shows "Invite sent successfully" when a fresh link is delivered |
| "This invite has already been accepted" | Password already set on this nonce | Normal — account is active. Use "Forgot password?" if they need a reset |

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

### Optimistic UI behaviour

Claim and unclaim update the badge **immediately** in the UI without waiting for the Airtable round-trip:

- **Claim:** Badge flips from "Unclaimed" to "Claimed" instantly. `fetchTasks()` syncs the real Airtable value in the background.
- **Unclaim:** Badge reverts to "Unclaimed" instantly. Toast reads "Task unclaimed" with no delay (unclaiming is trivially reversible by re-claiming, so no undo timer is shown).

The three-dot (`⋯`) action button on both claimed and unclaimed task cards shows a **"More actions"** tooltip on hover.

The Unclaim action uses a circular-arrow (↺) icon to distinguish it from Delete (✕).

### Viewing all claimed tasks

On the admin dashboard task view, use the **Status filter** to select **"Claimed"** — this shows every task currently assigned to a staff member. Claimed tasks display the claiming staff member's name alongside the task.

### Notes

- Due Date is optional.
- Use field IDs where emoji field names cause Airtable API issues.
- For admin claim/complete, plain field names are used for readability.
