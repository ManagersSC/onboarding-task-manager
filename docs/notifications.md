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
