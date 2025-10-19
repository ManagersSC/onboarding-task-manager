### Notification Preferences API and UI wiring

This feature enables admins to manage their notification channels and types on `Admin → Profile → Preferences → Notifications`.

Endpoints:

1) GET `/api/admin/profile/notification-preferences`

Response:

```json
{
  "channels": ["In-app", "Email", "Slack"],
  "enabledTypes": ["Task", "Quiz Completion"],
  "allTypes": ["Task", "Quiz Completion", "Document", "Announcement", "New Hire", "Task Assigned", "Task Completed", "Task Updated"]
}
```

Notes:
- `channels` returns the current Staff row multi-select values from `Notification Channels`.
- `enabledTypes` returns the multi-select values from `Notification Preferences`.
- `allTypes` is the source list used to render type toggles. Today this is a union of the saved `enabledTypes` and a fallback constant list when Airtable field options cannot be enumerated via API.

2) PUT `/api/admin/profile/notification-preferences`

Body:

```json
{
  "channels": ["Email", "Slack"],
  "enabledTypes": ["Task", "Quiz Completion"]
}
```

Response:

```json
{ "success": true }
```

Data model:
- Airtable `Staff` table fields used:
  - `Notification Preferences` (multi-select of type labels)
  - `Notification Channels` (multi-select; supports `Email`, `Slack`; in-app is always stored in `Notifications` table creation)

UI behavior:
- On load, the page fetches the GET endpoint, renders:
  - Channel toggles for Email and Slack
  - A list of type toggles using `allTypes`, checked against `enabledTypes`
- When any toggle changes, a "Save changes" button appears.
- Clicking "Save changes" issues the PUT with current selections and shows a success toast.

Audit logging:
- Both GET and PUT handlers log audit events for error cases. PUT logs a success event with a minimal summary of changes.

Fallback types strategy:
- If enumerating Airtable multi-select options is not possible in the runtime, the server returns a safe constant superset (see handler) merged with existing saved `enabledTypes`. Update this constant if new types are added, or migrate to a dedicated `Notification Types` registry as outlined in `docs/notifications-architecture.md`.


