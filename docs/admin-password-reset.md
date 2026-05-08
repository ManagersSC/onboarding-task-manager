# Admin & Staff Password Reset

Covers the full password-reset flow for **admin/staff accounts** (separate from the applicant reset flow).

---

## How it works

There are two independent reset flows depending on who is logging in:

| User type | Login page | Reset flow |
|-----------|-----------|------------|
| Applicant / team member | `/` (default tab) | `POST /api/forgot-password` → resets in `Applicants` table |
| Admin / staff | `/?mode=admin` | `POST /api/admin/forgot-password` → resets in `Staff` table |

Before this was implemented (pre-May 2026), clicking "Forgot password?" on the admin login silently failed — the form showed a success message but no reset email was ever sent, because the route only queried the `Applicants` table.

---

## Admin reset — step by step

1. Go to `/?mode=admin` (the Admin Login tab).
2. Click **"Forgot password?"** — you are taken to `/forgot-password?isAdmin=true`.
3. Enter your admin email address and submit.
4. The server:
   - Looks up the email in the `Staff` Airtable table (filtered to `IsAdmin = TRUE`).
   - Writes a one-time `Reset Nonce` to the Staff record.
   - Signs a 24-hour JWT containing `{ email, nonce, userTable: "Staff" }`.
   - Fires the `MAKE_WEBHOOK_URL_RESET_PASSWORD` Make.com webhook, which sends the reset email.
5. Check your inbox — click the **"Reset Password"** link.
6. The link opens `/reset-password?token=...` — enter and confirm your new password.
7. The server verifies the JWT, matches the nonce (single-use: clears on success), and updates the bcrypt hash in the `Staff` record.
8. Log in with the new password on the Admin tab.

> **Token is single-use.** Clicking the same reset link a second time returns "This reset link has already been used."

> **Token expires in 24 hours.** If the link is older than 24 hours, you will need to request a new one.

---

## Applicant reset — step by step

Same flow but without `?isAdmin=true`:

1. Go to `/forgot-password` (no query param) — or click "Forgot password?" on the default login tab.
2. Enter your applicant email and submit.
3. The server queries the `Applicants` table and fires the same Make.com webhook.
4. Reset link opens `/reset-password?token=...`, password is updated in `Applicants`.

---

## API endpoints

### `POST /api/admin/forgot-password`
Unauthenticated (public route — no session required).

```json
Body:    { "email": "admin@example.com" }
Success: { "message": "If that email is registered, a reset link has been sent." }
Error:   { "error": "..." }  (400 for bad input, 500 for server errors)
```

Queries `Staff` filtered by `IsAdmin = TRUE()`. Always returns the generic success message even if the email is not found (security: prevents email enumeration).

### `POST /api/forgot-password`
Unauthenticated (public route).

```json
Body:    { "email": "applicant@example.com" }
```

Queries `Applicants` table. Same response shape.

### `POST /api/reset-password`
Unauthenticated (public route). Used by **both** admin and applicant reset flows.

```json
Body: { "token": "<jwt>", "password": "...", "confirmPassword": "..." }
```

Reads `userTable` from the decoded JWT payload (`"Staff"` or `"Applicants"`) and updates the correct table. Validates the nonce before writing and clears it on success.

---

## Airtable requirements

| Table | Field | Type | Purpose |
|-------|-------|------|---------|
| `Staff` | `Reset Nonce` | Single line text | One-time token for reset verification |
| `Applicants` | `Reset Nonce` | Single line text | One-time token for reset verification |

Both fields must exist. If a `Reset Nonce` field is missing, the reset will fail silently (the nonce check will return empty and the link will be rejected as invalid).

---

## Make.com automation

The same scenario (`PASSWORD_RESET_EMAIL`) handles both admin and applicant resets. It uses the reset token from `{{1.resetToken}}` and appends it to the fixed base URL:

```
https://onboarding-task-manager.vercel.app/reset-password?token={{1.resetToken}}
```

No changes to the Make.com scenario are needed to support admin resets — the JWT's `userTable` field tells `reset-password` which Airtable table to update.

---

## Password rules (both flows)

- Minimum 8 characters
- At least one special character (e.g. `!@#$%`)
- No consecutive sequences (e.g. `123`, `abc`, `012`)

These rules are enforced on both the client (instant feedback) and the server (authoritative check).

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| No reset email received | Wrong flow used (admin email submitted on applicant form, or vice versa) | Use `/?mode=admin` → "Forgot password?" for admin accounts |
| "Invalid or expired token" immediately | Token is older than 24 hours | Request a new reset link |
| "This reset link has already been used" | Link was already submitted once | Request a new reset link |
| Form shows success but email never arrives | Make.com scenario paused or Gmail disconnected | Check Make.com dashboard; confirm Gmail connection is active |
