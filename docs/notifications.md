# Notifications

## Overview

In-app notifications are stored in the `Notifications` Airtable table. Delivery channels (Email, Slack) are handled via Make.com. Per-user preferences control which types and channels are active for each staff member.

## Notification Preferences API

### GET `/api/admin/profile/notification-preferences`

Returns the current admin's notification settings.

```json
{
  "channels": ["In-app", "Email", "Slack"],
  "enabledTypes": ["Task", "Quiz Completion"],
  "allTypes": ["Task", "Quiz Completion", "Document", "Announcement", "New Hire", "Task Assigned", "Task Completed", "Task Updated"]
}
```

- `channels` — multi-select values from `Staff.Notification Channels`
- `enabledTypes` — multi-select values from `Staff.Notification Preferences`
- `allTypes` — full list used to render type toggles in the UI

### PUT `/api/admin/profile/notification-preferences`

Save updated preferences.

```json
{
  "channels": ["Email", "Slack"],
  "enabledTypes": ["Task", "Quiz Completion"]
}
```

Response: `{ "success": true }`

Both endpoints are audit-logged. PUT logs a success event with a summary of changes.

## UI (Admin → Profile → Preferences → Notifications)

- Channel toggles for Email and Slack (In-app is always on)
- Type toggles for each notification type
- "Save changes" button appears on any change; shows a success toast on save

## Airtable Data Model

**Staff table fields:**
- `Notification Preferences` — multi-select of enabled type labels
- `Notification Channels` — multi-select (`Email`, `Slack`)

**Notifications table fields:**
- `Title`, `Body`, `Severity`, `Recipient` (link to Staff), `Read`, `Action URL`, `Source`, `Type`

### Required `Notification Preferences` options

The `Notification Preferences` field must have these exact option strings (case-sensitive — the code's `preferences.includes(type)` check is strict). Cross-referenced against `docs/ATS_schema.json` May 2026:

| Option string | Status | Triggered by |
|---|---|---|
| `Task Assignment` | ✅ exists | Task assigned to applicant |
| `Task Completion` | ✅ exists | Task marked complete |
| `Task Update` | ✅ exists | Task updated |
| `Task Deletion` | ✅ exists | Task deleted |
| `Task Unclaimed` | ✅ exists | Task unclaimed |
| `Task Flagged` | ✅ exists | Task flagged |
| `Task Flag Resolved` | ✅ exists | Flag resolved |
| `Task Flag Resolved & Completed` | ✅ exists | Flag resolved and completed |
| `Task Claim-All Executed` | ✅ exists | Bulk claim-all action |
| `Document Upload` | ✅ exists | Document uploaded |
| `Quiz Completion` | ✅ exists | Quiz passed |
| `Quiz Failed` | ❌ missing | Quiz failed — **add this option** |
| `Applicant Stage Updated` | ✅ exists | Stage advanced, rejected, or overridden |
| `Onboarding Paused` | ✅ exists | Onboarding paused |
| `Onboarding Resumed` | ✅ exists | Onboarding resumed |
| `Onboarding started` | ✅ exists | Onboarding started (note lowercase 's' — matches code) |
| `New Hire Added` | ✅ exists | New hire record created |
| `Admin Invited` | ✅ exists | Admin invite sent |
| `Admin Invite Accepted` | ✅ exists | Admin accepted invite |
| `Appraisal` | ❌ missing | Appraisal date set, appraisal doc uploaded — **add this option** |
| `Monthly Review` | ❌ missing | Monthly review scheduled — **add this option** |
| `Monthly Review Cancelled` | ❌ missing | Monthly review deleted — **add this option** |
| `Announcement` | ✅ exists | System announcement |
| `Custom` | ✅ exists | Custom notification |

> **Missing options cause silent failures.** If an option string doesn't exist in the field, `createNotification` cannot match it against any admin's saved preferences and will silently skip the notification — no error is thrown.

> **Adding a new notification type** requires: (1) add a constant to `src/lib/notification-types.js`, (2) add the matching option to `Staff → Notification Preferences` in Airtable, (3) call `createNotification` with that type in the relevant route.

## Scalable Architecture (Future)

The current implementation uses flat multi-select fields on the `Staff` table. A more scalable approach would introduce:

1. **Notification Types table** — Registry of all event types with metadata, defaults, and channel configuration. Keyed by strings like `task.assigned`.
2. **Staff Notification Preferences table** — Relational join table for per-user, per-type overrides (enabled, channels, severity threshold).

This would allow new notification types to be added by inserting a row rather than updating code, and support more granular per-type channel control.

### Delivery Flow (Proposed)

1. Producer emits an event with a `typeKey` and `payload`
2. Lookup type defaults from registry
3. For each recipient, load user override (if exists) or use defaults
4. If not enabled or severity below threshold → skip
5. Always create in-app `Notifications` record
6. Fan-out to Email/Slack via Make.com webhook with `channels` and `typeKey`

### API Contracts (Proposed)

```
GET  /api/notification-types
GET  /api/me/notification-preferences
PUT  /api/me/notification-preferences
     body: { overrides: { [typeKey]: { enabled?, channels?, severityThreshold? } } }
```

If implementing: add `Notification Types` table, seed with existing type keys (`task.assigned`, `task.created`, `task.completed`, `document.uploaded`, `quiz.completed`, `announcement.posted`), then migrate `Staff.Notification Preferences` to the join table.
