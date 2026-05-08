# TASK: Appraisal Manager Notifications

**Branch:** `test/notifications-workflow`
**Status:** In Progress

---

> ⚠️ **FOR ANY CLAUDE INSTANCE PICKING UP THIS TASK:**
> Read the current state of every referenced file before implementing.
> Validate the root cause still exists at the described line numbers — they may have shifted.

---

## Problem

When an admin sets an appraisal date for an applicant, only the admin who performed the action
receives a notification ("Appraisal Date Updated"). No other admins or managers are informed.

The client needs **all admin/manager accounts** to be notified when an appraisal is scheduled —
so that the relevant manager (nurse manager, reception manager, etc.) is aware without requiring
any manual communication.

## Decision: Notify All Admins via Existing `createNotification` Infrastructure

The existing `createNotification` function (`src/lib/notifications.js`) already handles:
1. Checking if the recipient has `"Appraisal"` enabled in their `Notification Preferences`
2. Creating an in-app notification record in Airtable `Notifications` table
3. Firing `MAKE_WEBHOOK_URL_NOTIFICATIONS` for Email/Slack delivery (best-effort, non-fatal)

The Make.com scenario (`docs/handover/automations/onboarding/GENERAL_NOTIFICATIONS.json`) receives
`{ title, body, type, severity, recipientId, channels }` and:
- **Email route**: filter `channels contains "Email"` → fetch `Staff.Email` by `recipientId` → send Gmail
- **Slack route**: filter `channels contains "Slack"` → fetch `Staff["Slack ID"]` by `recipientId` → DM

**No Make.com changes needed.** The webhook payload produced by `createNotification` is already
compatible with the existing scenario.

The notification message will include the applicant's name and job role so managers can immediately
see who the appraisal is for without needing to open the platform.

Role-specific routing is handled by the admin's own preferences — if the client later wants
nurse managers to only receive nurse applicant notifications, a Staff "Department" field and filter
can be added. For now, all admins get all appraisal notifications, which is the client's request.

---

## Airtable Prerequisites (Client Must Do)

1. In the `Staff` table → `Notification Preferences` multi-select field:
   - Confirm `"Appraisal"` option exists (it should — it's already a value in the codebase's
     `NOTIFICATION_TYPES.APPRAISAL = "Appraisal"` constant).
   - If it doesn't appear in the Airtable field options, add it manually.
   - Each admin who wants to receive notifications must enable `"Appraisal"` in their preferences
     via Admin → Profile → Preferences → Notifications.

2. Each admin who wants **email** delivery must also have `"Email"` in their
   `Notification Channels` field (same Preferences UI).

> If an admin has not enabled the `"Appraisal"` type in their preferences, they will receive
> **no** in-app notification and no email. This is by design — it respects per-user preferences.

---

## File to Change

**`src/app/api/admin/users/[id]/appraisal-date/route.js`**

### Current behaviour (reference line numbers — verify before editing)

- **Lines 66–73**: Fetches the applicant record from Airtable with fields
  `[FIELD_APPRAISAL_HISTORY, FIELD_QUESTIONS_OVERRIDE]` to build the appraisal history.
- **Lines 171–188**: After the Airtable update, queries the Staff record for the
  **acting admin only** (the one who set the date) and calls `createNotification` once with
  the message `"Appraisal set to ${dateStr}. An appointment event has been created..."`.

### Required changes

#### Change 1 — Extend the applicant fetch to include Name and Job Name

In the `.select({ ... fields: [...] ... })` call at ~line 68, add `"Name"` and `"Job Name"`
to the fields array:

```js
fields: [FIELD_APPRAISAL_HISTORY, FIELD_QUESTIONS_OVERRIDE, "Name", "Job Name"],
```

After the fetch resolves, extract the values (after the existing `questionsOverrideRaw` line):

```js
const applicantName = records?.[0]?.get?.("Name") || "Unknown"
const applicantJobName = records?.[0]?.get?.("Job Name") || "Unknown Role"
```

#### Change 2 — Replace single-admin notification with all-admins notification

**Remove** the existing notification block (~lines 171–188):

```js
// Notify acting staff (if Staff record exists)
try {
  const staffRecs = await base("Staff").select({ filterByFormula: `{Email}='${...}'`, ... })
  ...
  await createNotification({ title: "Appraisal Date Updated", ... })
} catch (e) { ... }
```

**Replace** with a query for all admins and a `Promise.all` notify:

```js
// Notify all admins about the scheduled appraisal
try {
  const adminRecs = await base("Staff")
    .select({ filterByFormula: "{IsAdmin} = TRUE()", fields: ["Name"] })
    .firstPage()
  if (adminRecs.length > 0) {
    await Promise.all(
      adminRecs.map((admin) =>
        createNotification({
          title: "Appraisal Scheduled",
          body: `${applicantName} (${applicantJobName}) has an appraisal scheduled for ${dateStr}.`,
          type: NOTIFICATION_TYPES.APPRAISAL,
          severity: "Info",
          recipientId: admin.id,
          actionUrl: "/admin/users",
          source: "Appraisal",
        })
      )
    )
  }
} catch (e) {
  logger?.error?.("createNotification failed for appraisal date — all admins", e)
}
```

> **Why `.firstPage()` is fine here:** The `Staff` table has a small number of admins (typically < 10).
> Airtable's default page size is 100 records. No pagination needed.

> **Why `Promise.all` instead of sequential:** Each `createNotification` call involves 2 Airtable
> reads (Staff prefs + Notifications create) plus a non-blocking fetch to Make.com. Running them in
> parallel cuts response time proportionally to the number of admins. Failures in one do not cancel
> others — `createNotification` catches internally.

---

## Sub-tasks

- [x] **Step 0** — Create this TASK doc (done)
- [x] **Step 1** — Extend applicant fetch to include `"Name"` and `"Job Name"` fields; extract `applicantName` + `applicantJobName` from record
- [x] **Step 2** — Replace single-admin notification block with all-admins `Promise.all` notify
- [x] **Step 3** — Update `docs/appraisal-system.md` to document the notification behaviour
- [x] **Step 4** — Commit with message `feat: notify all admins when appraisal date is set`

---

## Verification Checklist

- [ ] `npm run lint` passes
- [ ] `npm run dev` → set an appraisal date for a test applicant
- [ ] In Airtable `Notifications` table: confirm one record per admin was created with
      `Type = "Appraisal"` and body containing the applicant name and job role
- [ ] In-app: admin notification bell shows the new notification
- [ ] If an admin has `"Email"` in their channels + `"Appraisal"` in preferences: confirm email received
- [ ] If an admin does NOT have `"Appraisal"` in preferences: confirm no record created for them
      (check `createNotification` logs: `"type='Appraisal' not in preferences — skipping"`)

---

## What is NOT Changing

- No Make.com scenario changes required
- No new environment variables needed
- No Airtable schema changes required (just enabling the existing `"Appraisal"` option
  in each admin's preferences — client action)
- The route's response shape and status codes are unchanged
- Audit logging is unchanged
