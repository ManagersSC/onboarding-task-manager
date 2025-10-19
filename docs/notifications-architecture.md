## Scalable Notifications and Preferences

### Problem
- Current setup stores per-user preferences in the Staff table field `Notification Preferences` and separately records a `Type` in the `Notifications` table. This duplicates concerns and makes it hard to add new event types at scale.

### Goals
- Single source of truth for all notification types (taxonomy) with metadata and defaults.
- Per-user, per-type overrides for enablement, channels, and severity thresholds.
- Backward-compatible with existing fields; easy migration path.
- Channel-agnostic delivery (in-app, Email, Slack today; others later).
- Simple UI on `/admin/profile` to manage preferences dynamically from the registry.

---

## Data Model (Airtable)

### 1) Notification Types (new)
- **Key**: unique string, e.g. `task.assigned` (primary)
- **Label**: human title, e.g. "Task Assignment"
- **Category**: e.g. `tasks`, `applicants`, `system`
- **Description**: short description for UI tooltips
- **Default Enabled**: checkbox
- **Default Channels**: multi-select (values: `In-app`, `Email`, `Slack`)
- **Default Severity**: single select (`info`, `success`, `warning`, `error`)
- **Active**: checkbox
- (Optional) **Audience**: multi-select or linked role(s) to target by default
- (Optional) **Version**: number for template versioning

### 2) Staff Notification Preferences (new)
Relational join table to store overrides per user and type.
- **Staff**: link to `Staff`
- **Type**: link to `Notification Types`
- **Enabled**: checkbox
- **Channels**: multi-select (`In-app`, `Email`, `Slack`)
- **Severity Threshold**: single select (deliver if event severity ≥ threshold)
- (Optional) **Digest**: single select (`immediate`, `daily`, `weekly`)

### 3) Notifications (existing)
- Keep a `Type` field but convert it to a link to `Notification Types` instead of free text.
- Add `Payload` (long text JSON) to capture event context (non-sensitive), and keep existing fields (`Title`, `Body`, `Severity`, `Recipient`, `Read`, `Action URL`, `Source`).

### 4) Staff (existing)
- Keep current fields `Notification Preferences` and `Notification Channels` temporarily for backward-compatibility. Mark as deprecated once migration completes.

---

## Delivery Flow
1) Producer emits an event with a `typeKey` and `payload` (e.g., `task.assigned`).
2) Lookup `Notification Types` by key → get defaults (enabled, channels, severity).
3) For each intended recipient:
   - Load override from `Staff Notification Preferences` (if exists), otherwise use type defaults.
   - Compute effective settings: `enabled`, `channels`, `severityThreshold`.
   - If not enabled or event severity < threshold → skip delivery for that recipient.
4) Always create an in-app record in `Notifications` (respect `In-app` channel to control badge counts if desired).
5) Deliver to external channels (Email/Slack) if included in effective channels. Continue to use Make.com webhook, but pass `channels` and `typeKey` explicitly.

---

## API Contracts (Next.js)

```http
GET  /api/notification-types
  →  [{ key, label, category, description, defaults: { enabled, channels, severity }, active }]

GET  /api/me/notification-preferences
  →  { channels: ["In-app","Email","Slack"], overrides: { [typeKey]: { enabled, channels, severityThreshold } } }

PUT  /api/me/notification-preferences
  body: { overrides: { [typeKey]: { enabled?, channels?, severityThreshold? } } }
  →  200 OK
```

Notes:
- The UI fetches `notification-types` to render groups and switches. It fetches the user's `notification-preferences` to pre-fill state and submits changes via PUT.
- Server resolves and persists to `Staff Notification Preferences` linking table.

---

## UI Wiring (`/admin/profile` → Notifications card)
- Replace hardcoded switches with dynamic rendering:
  - Show channel master toggles if needed for defaults, but per-type channel switches should come from the types registry.
  - Group types by `Category` with section headers; add "Enable all in group" and a search filter.
  - For each type: switch for Enabled, and a compact channel chip selector. Optional severity dropdown (Info/Success/Warning/Error) to act as a threshold.
- Add actions: "Reset to defaults" and "Save".

---

## Migration Plan
1) Create `Notification Types` and seed with existing types:
   - `task.assigned`, `task.created`, `task.completed`, `task.updated`, `task.deleted`, `document.uploaded`, `quiz.completed`, `announcement.posted`, `custom`.
2) Create `Staff Notification Preferences`.
3) Backfill:
   - For each Staff row, interpret legacy `Notification Preferences` and `Notification Channels` into one or more rows in `Staff Notification Preferences` aligned to the new type keys.
   - Keep legacy fields in place but stop reading them in new code paths.
4) Update `Notifications.Type` to link to `Notification Types` using the key mapping.
5) Deploy new `createNotification` implementation (below). Monitor logs. Remove legacy fields after stability period.

---

## createNotification (new shape)

```ts
// signature focuses on the event key; templates and defaults come from the registry
type CreateNotificationArgs = {
  typeKey: string;            // e.g., "task.assigned"
  title?: string;             // optional override; can be templated server-side by type
  body?: string;              // optional override
  severity?: "info"|"success"|"warning"|"error";
  recipientIds: string[];     // Airtable record IDs of Staff
  actionUrl?: string;
  source?: string;
  payload?: Record<string, unknown>; // stored in Notifications.Payload
};

async function createNotification(args: CreateNotificationArgs) {
  // 1) get Notification Types row by key → defaults
  // 2) for each recipient, load override from Staff Notification Preferences
  // 3) compute effective settings and skip if disabled/under threshold
  // 4) create Notifications row (in-app)
  // 5) fan-out to Email/Slack via Make.com if included in effective channels
}
```

Backward-compatibility: if the type key is not found, log and fall back to a sensible default (`enabled=true`, `channels=["In-app"]`).

---

## Why this scales
- Adding a new event type requires only adding a row in `Notification Types` (no code or schema changes elsewhere).
- Per-user overrides live in a normalized join table; there is no explosion of columns on `Staff`.
- Channels are metadata-driven, so adding a channel later (e.g., SMS) is mostly a config/UI change.
- Linking `Notifications.Type` to the registry keeps analytics and filtering consistent.

---

## Notes on Templates (optional enhancement)
- Add `Notification Templates` table keyed by `(Type, Channel, Version)` with `Title Template` and `Body Template`. The server can render templates using event `payload` to avoid hardcoding strings.

---

## Next steps
1) Create the two new tables and seed types.
2) Add read/write APIs and swap the UI to dynamic rendering.
3) Replace the current `createNotification` logic to use the registry + overrides.
4) Backfill legacy fields and then deprecate them.






