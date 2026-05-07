# TASK: Admin Invite Workflow Audit

**Branch:** `master` (documentation only — no code changes in this file)
**Status:** Research complete. Bugs documented. Awaiting implementation decisions.

---

> ⚠️ **FOR ANY CLAUDE INSTANCE PICKING UP THIS TASK:**
> Before implementing any solution below, read the current state of every referenced file.
> Code may have changed since this document was written. Validate the root cause still exists
> in its described form before making changes. Never implement blindly from this document.

---

## Full Workflow: Creating a New Admin

### Overview
The admin invite flow creates a Staff record in Airtable, emails an invite link via Make.com, and lets the invitee set their password through a dedicated page.

---

### Step 1 — UI: Admin triggers the invite
**File:** `src/app/admin/profile/page.js` (function `sendInvite`, ~line 173)

- Admin clicks "Create Admin" on the Profile page.
- A two-step dialog opens: enter name + email, then confirm.
- On confirm, POSTs `{ name, email }` to `/api/admin/invite-admin`.

---

### Step 2 — API: Staff record created and invite link generated
**File:** `src/app/api/admin/invite-admin/route.js`

1. Verifies the requester holds a valid `admin` iron-session cookie.
2. Validates `name` and `email` (email format checked via regex).
3. Normalises email to lowercase.
4. Queries Airtable `Staff` table for an existing record with that email.
   - **Exists + has `Password`** → 400 "User already has an admin account"
   - **Exists + no `Password`** → reuses record (re-invite scenario)
   - **Not found** → creates new Staff record: `{ Name, Email, IsAdmin: true, Password: "" }`
5. Generates a UUID `inviteNonce` and stores it in `Staff["Invite Nonce"]`.
6. Signs a 24-hour JWT: `{ staffId, email, type: "admin_invite", nonce: inviteNonce }`.
7. Builds invite link: `{APP_BASE_URL}/accept-admin-invite?token={encodeURIComponent(jwt)}`.
8. POSTs the webhook payload to `MAKE_WEBHOOK_URL_ADMIN_PASSWORD_PAGE`:
   ```json
   {
     "name": "<name from request>",
     "email": "<normalised email>",
     "inviteLink": "<full URL with JWT>",
     "requestedBy": "<requester email>",
     "requestedAt": "<ISO timestamp>"
   }
   ```
9. Checks `webhookRes.ok` — returns 502 if not OK.
10. Logs audit event to `Website Audit Log` Airtable table.
11. Returns `{ message: "Invite sent", staffId }`.

---

### Step 3 — Make.com: Email sent to invitee
**File:** `docs/handover/automations/onboarding/ADMIN_INVITE_EMAIL.json`

The Make.com scenario is triggered by the webhook. It runs **instantly on arrival (async)** — confirmed.

| Module | Action |
|--------|--------|
| 1 | Receives webhook payload (`gateway:CustomWebHook`) |
| 2 | Sends HTML email via `managers@smilecliniq.com` Gmail (`google-email:ActionSendEmail`) |
| 3 | Responds `{"success": true, "messageId": "..."}` with HTTP 200 (`gateway:WebhookRespond`) |
| Error on 2 | Responds `{"success": false, "error": "..."}` with HTTP 500 |

The email addresses the user as `{{1.name}}` and links them to `{{1.inviteLink}}`.

> **Key fact:** Because this is an **async/instant webhook**, Make.com responds with HTTP 200
> immediately on receipt — **before** Module 2 (send email) has run. This means the HTTP 200
> response the API receives does NOT confirm that the email was sent.

---

### Step 4 — UI: Invitee sets their password
**File:** `src/app/accept-admin-invite/page.js`

- Invitee opens the link from their email.
- JWT is read from `?token=` query param via `useSearchParams`.
- They fill in password + confirm password.
- Client validates: 8+ chars, special char required, no consecutive sequences (`012`, `123`, etc.).
- POSTs `{ token, password, confirmPassword }` to `/api/admin/accept-invite`.

---

### Step 5 — API: Account finalised, session created
**File:** `src/app/api/admin/accept-invite/route.js`

1. Validates password rules (same as client-side).
2. Verifies JWT signature with `JWT_SECRET`.
3. Extracts `{ staffId, email, type, nonce }` from JWT payload.
4. Validates `type === "admin_invite"`.
5. Fetches Staff record by `staffId`; confirms email matches JWT.
6. Blocks if `Password` is already set — prevents token reuse.
7. Compares JWT `nonce` against `Staff["Invite Nonce"]` — rejects if mismatched or empty.
8. Bcrypt-hashes the password (10 salt rounds).
9. Updates Staff: `{ Password: hash, IsAdmin: true, "Invite Nonce": "" }`.
10. Creates iron-session cookie: `{ userEmail, userRole: "admin", userName, userStaffId }`, TTL 8h.
11. Logs audit event.
12. Returns `{ redirect: "/admin/dashboard" }` → client calls `router.push()`.

---

### Airtable Tables Involved

| Table | Fields Written |
|-------|---------------|
| `Staff` | `Name`, `Email`, `Password` (hashed), `IsAdmin`, `Invite Nonce` |
| `Website Audit Log` | `Timestamp`, `Event Type`, `Event Status`, `Role`, `Name`, `User Identifier`, `Detailed Message`, `IP Address`, `User Agent` |

---

## Bugs

---

### Bug 1 — Make.com error message swallowed in 502 response
**Severity:** Low (original diagnosis revised — see note)  
**File:** `src/app/api/admin/invite-admin/route.js` lines 119–128  
**Status:** ✅ Original diagnosis corrected.

**Diagnosis revision:**  
The automation blueprint contains `gateway:WebhookRespond` modules (Module 3 on success, Module 4 on error). This is Make.com's **custom response** feature — the webhook holds the HTTP connection open and sends back the actual 200 or 500 after the modules finish. "Instant" means the scenario triggers immediately on receipt (not on a schedule), not that it responds before processing. The `webhookRes.ok` check therefore **does work correctly** and email failures are properly detected.

**Remaining issue:**  
When Make.com returns a 500, the API reads the body as text and logs it, but sends the admin a generic "Failed to trigger invite email" with no details. The Make.com error body `{"success":false, "error":"<gmail error>"}` is lost. The admin cannot tell from the response why the email failed.

**Proposed solution:**  
Parse the Make.com response body as JSON and surface the error message in the 502:
```js
const webhookBody = await webhookRes.json().catch(() => null)
if (!webhookRes.ok) {
  const makeError = webhookBody?.error || "Unknown error"
  logger.error("Admin invite webhook failed", { status: webhookRes.status, body: webhookBody })
  return Response.json({ error: `Failed to trigger invite email: ${makeError}` }, { status: 502 })
}
```

> **⚠️ VALIDATE BEFORE IMPLEMENTING:**  
> Confirm the Make.com error body field is `error` (not `message` or similar) by checking the blueprint's Module 4 mapper: `{"success":false, "error":"{{2.error.message}}"}` — field name is `error`. ✓

---

### Bug 2 — Orphaned Staff record when webhook fails
**Severity:** Medium  
**File:** `src/app/api/admin/invite-admin/route.js` lines 70–93 (record created/nonce set) vs lines 119–128 (webhook call)

**Root cause:**
The Staff record is created and the `Invite Nonce` is stored in Airtable **before** the webhook is called. If the webhook returns an error (or if Bug 1's fix causes it to detect a failure), the API returns 502 — but the half-initialised Staff record is left in Airtable with a dangling nonce. The admin sees an error with no indication a record was created.

On retry, the code correctly finds the existing record (empty password = not configured), overwrites the nonce, and retries the webhook. The old invite link is silently invalidated. This is recoverable but invisible to the admin and creates confusing Airtable state.

**Proposed solution (Option A — rollback on failure):**  
After the webhook fails, delete the newly-created Staff record (only if it was created in this request, not an existing one):
```js
// Track whether we created the record in this request
let createdInThisRequest = false

if (existing.length === 0) {
  // ... create record
  createdInThisRequest = true
}

// ... after webhook fails:
if (!webhookRes.ok && createdInThisRequest) {
  await base("Staff").destroy([staffId]).catch(() => {})
}
return Response.json({ error: "Failed to trigger invite email" }, { status: 502 })
```

**Proposed solution (Option B — accept the state, improve the error message):**  
Keep the current behaviour (record stays) but return a more informative error:
```js
return Response.json({
  error: "Invite email failed to send. The account has been created — you can retry the invite.",
  staffId,
}, { status: 502 })
```
The frontend could surface a "Retry" action.

> **⚠️ VALIDATE BEFORE IMPLEMENTING:**  
> 1. Read current `invite-admin/route.js` in full to confirm the record creation and webhook call order.  
> 2. Check whether any other code path relies on the Staff record existing before the webhook succeeds.  
> 3. If choosing Option A, verify that `base("Staff").destroy([id])` is the correct Airtable SDK call in this codebase (check other routes that delete records for the pattern).

---

### Bug 3 — Re-invite does not update the `Name` field in Airtable
**Severity:** Low  
**File:** `src/app/api/admin/invite-admin/route.js` lines 67–82

**Root cause:**
When an existing Staff record is found (the re-invite path), only the `Invite Nonce` is updated. The `Name` field is not written. If the original name was misspelled and the admin re-invites with the corrected name, the Airtable record retains the old name. The webhook email uses the new name from the request payload (correct), but Airtable is stale.

**Proposed solution:**  
Update `Name` when writing the nonce on re-invite:
```js
await base("Staff").update([{
  id: staffId,
  fields: {
    Name: name.trim(),       // update name in case it changed
    "Invite Nonce": inviteNonce,
  }
}])
```

> **⚠️ VALIDATE BEFORE IMPLEMENTING:**  
> Read current `invite-admin/route.js` to confirm the nonce update call at ~line 90. Ensure the `name` variable is available at that point (it is, from `request.json()`).

---

### Bug 4 — Non-admin Staff record silently promoted to admin
**Severity:** Low  
**File:** `src/app/api/admin/invite-admin/route.js` line 62

**Root cause:**
The existing-record lookup queries `Staff` by `Email` only — it does not filter by `IsAdmin`. If a Staff record exists with `IsAdmin: false` (a non-admin staff member), the invite flow will find it, add an `Invite Nonce`, send an invite email, and ultimately set `IsAdmin: true` when the invite is accepted. The inviting admin receives no warning that they're upgrading an existing account.

**Proposed solution:**  
Surface a warning when the found record is not already an admin:
```js
if (existing.length > 0) {
  staffId = existing[0].id
  alreadyConfigured = Boolean(existing[0].fields?.Password)
  const isAlreadyAdmin = Boolean(existing[0].fields?.IsAdmin)
  if (!isAlreadyAdmin && !alreadyConfigured) {
    // Log or return a warning — or add a flag to the response
    logger.warn(`invite-admin: existing non-admin Staff record will be promoted`, { staffId })
  }
}
```
Alternatively, return a distinct response code/message to the frontend so the admin is shown a confirmation dialog ("This email belongs to an existing non-admin staff member. Promote them to admin?").

> **⚠️ VALIDATE BEFORE IMPLEMENTING:**  
> 1. Confirm the `IsAdmin` field name in Airtable matches exactly (case-sensitive). Check other routes that read this field, e.g. `src/app/api/admin/login/route.js`.  
> 2. Decide whether this should block the invite (require explicit confirmation) or just log a warning — this is a product decision.

---

### Bug 5 — No token expiry feedback on page load
**Severity:** UX  
**File:** `src/app/accept-admin-invite/page.js` lines 25–28

**Root cause:**
The page reads the `?token=` query param and stores it in state, but does not decode or validate the JWT on mount. If the user opens an expired link (token > 24h old), they won't know until they fill in their password and submit — at which point the API returns "Invalid or expired token".

**Proposed solution:**  
Decode (not verify — no secret needed client-side) the JWT on mount to read the `exp` claim:
```js
useEffect(() => {
  const t = searchParams.get("token")
  if (!t) return
  setToken(t)
  try {
    const parts = t.split(".")
    if (parts.length === 3) {
      const decoded = JSON.parse(atob(parts[1]))
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        setError("This invite link has expired. Ask an admin to resend the invite.")
      }
    }
  } catch {
    // silently ignore decode errors — server will catch them on submit
  }
}, [searchParams])
```

> **⚠️ VALIDATE BEFORE IMPLEMENTING:**  
> 1. Read `accept-admin-invite/page.js` in full to confirm no expiry check already exists.  
> 2. Confirm that the `setError` state variable is used for the error display block (it is, based on current code).  
> 3. This is a UX improvement only — the server still validates the token on submit regardless.

---

### Bug 6 — `name` is not trimmed before use
**Severity:** Very Low  
**File:** `src/app/api/admin/invite-admin/route.js` lines 32–34, 72–78

**Root cause:**
`email` is trimmed and lowercased before use, but `name` is used as-is from `request.json()`. A name with leading/trailing spaces (e.g., `"  John Smith  "`) passes the `!name` check, gets stored in Airtable with spaces, and the email template greets the user as `"Hi   John Smith  ,"`.

**Proposed solution:**  
Add `name.trim()` at the point of use:
```js
const normalisedName = String(name).trim()
if (!normalisedName || !email) {
  return Response.json({ error: "Name and email are required" }, { status: 400 })
}
```
Then use `normalisedName` everywhere `name` is used (Staff record creation, webhook payload).

> **⚠️ VALIDATE BEFORE IMPLEMENTING:**  
> Read current `invite-admin/route.js` and confirm all places where `name` is used in the function body (Airtable create, webhook payload, audit log). Replace all of them.

---

## Bug Priority

| # | Bug | Severity | Effort |
|---|-----|----------|--------|
| 1 | Make.com error message swallowed in 502 (webhook is sync — original async diagnosis was wrong) | Low | Trivial |
| 2 | Orphaned Staff record on webhook failure | Medium | Small–Medium |
| 3 | Re-invite doesn't update `Name` | Low | Trivial |
| 4 | Non-admin Staff silently promoted | Low | Small |
| 5 | No expiry feedback on page load | UX | Small |
| 6 | `name` not trimmed | Very Low | Trivial |
