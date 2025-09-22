Admin Invite & Accept Flow

This document explains the admin account creation flow using a secure invite, Make.com email delivery, and Airtable `Staff` storage.

Overview

- Admins can invite a new admin from `admin/profile` via the "Create Admin" button.
- The server generates a 24h JWT invite token and calls the Make.com webhook to send the invite email with a password setup link.
- The invitee opens the link, sets a password, and can then log in at the admin login.

Endpoints

- POST `/api/admin/invite-admin`
  - Auth: requires an admin session cookie.
  - Body: `{ name: string, email: string }`
  - Actions:
    - Upserts a record in Airtable `Staff` with `IsAdmin = true` and empty `Password` if not existing.
    - Issues a 24h JWT (`type: "admin_invite"`) containing `{ staffId, email }`.
    - Calls Make.com webhook `MAKE_WEBHOOK_URL_ADMIN_PASSWORD_PAGE` with `{ name, email, inviteLink }`.
  - Returns: `{ message: "Invite sent", staffId }`.

- POST `/api/admin/accept-invite`
  - Body: `{ token, password, confirmPassword }`
  - Verifies the JWT and updates the associated `Staff` record with a bcrypt hashed password.

Pages

- GET `/accept-admin-invite?token=...` (public)
  - Sleek form to set password and submit to the accept endpoint.

Environment

Add to `.env`:

- `MAKE_WEBHOOK_URL_ADMIN_PASSWORD_PAGE=...`
- `JWT_SECRET=...`
- `SESSION_SECRET=...`
- `AIRTABLE_API_KEY=...`
- `AIRTABLE_BASE_ID=...`

Airtable

`Staff` table must have fields `Name`, `Email`, `Password`, `IsAdmin` per existing schema.

Audit Logging

Major actions are logged to `Website Audit Log` via `logAuditEvent` with types: `User` (invite/accept) and `Server` (errors).

Safety UX

- The profile UI shows a guarded dialog with a final confirmation step before sending the invite.
- Email validation and session-based authorization are enforced server-side.


