### Admin Audit Logs — Product & Technical Specification

#### Goal
Provide a dedicated, production-ready Admin page to explore all Website Audit Logs in one place with robust filtering, fast navigation, and secure access for troubleshooting, compliance, and analytics.

#### Non-Goals
- Changing how logs are generated/ingested. This spec only covers reading, exploring, and exporting.
- Replacing the small Recent Activity widget shown on the dashboard (`ActivityFeed`).

---

## Data Source

- Table: “Website Audit Log” (see `docs/ATS_schema.txt`) with fields:
  - Timestamp (`fldVybsVy0nY5uXwk`)
  - Event Type (`fldfBD1QoTCMS5ieg`)
  - Event Status (`fldQas2jWxBUPKHRG`)
  - Role (`fld84XSD3GqVcSkD6`)
  - Name (`fldHehGB5RN1Qe6eJ`)
  - User Identifier (`fldZBnuejMBCeiSy6`)
  - Detailed Message (`fldHuF1EnocpW1vqz`)
  - IP Address (`fldpxLlFidAAG3DsQ`)
  - User Agent (`fldd9xNNBuyFx9Qg7`)

We will not persist derived data back to the table; all transforms happen at read-time.

---

## User Stories

- As an Admin, I can browse all logs with pagination and fast search.
- As an Admin, I can filter logs by time range, type, status, role, user identifier, IP, and keyword across message/name/agent.
- As an Admin, I can sort by timestamp (desc by default), and then by type/status if needed.
- As an Admin, I can view a log’s full detail in a drawer/modal without leaving the table.
- As an Admin, I can export filtered results (CSV/JSON) for sharing or offline analysis.
- As an Admin, I can copy values (user id, IP, message) quickly.
- As a Security reviewer, I can restrict access to Admins only, with server-side authorization.

---

## Page IA & Routes

- Path: `/admin/audit-logs`
- Navigation: add an entry to the Admin sidebar `Audit Logs` under an “Observability” or “System” group.
- Breadcrumbs: `Admin > Audit Logs`

---

## UX Design

### Layout
- Header with title, quick stats, and a link to docs.
- Filters toolbar (collapsible on mobile):
  - Time range: presets (Last 24h, 7d, 30d, Custom)
  - Event Type (multi-select)
  - Status (multi-select)
  - Role (multi-select)
  - User Identifier (text)
  - IP Address (text)
  - Keyword search (free-text across Name, Detailed Message, User Agent)
- Results region:
  - Primary Table view (default)
  - Optional Timeline view toggle (vertical list grouped by hour/day)
  - Virtualized rows for fast scroll
  - Sticky header with column controls
- Detail Drawer/Modal:
  - All fields with monospace for technical fields
  - Copy buttons per field
  - Raw JSON panel (normalized log payload where applicable)

### Table Columns (configurable)
- Timestamp (default sort: desc)
- Event Type
- Status
- Role
- Name
- User Identifier
- IP Address (masked by default; reveal on click if Admin)
- User Agent (truncated with tooltip)
- Message (1-line with overflow; full in detail view)

### Quick Stats (top of page)
- Total logs in current range
- Error/Failure count in current range
- Breakdown by Event Type (top 5)

### Empty/Loading/Error States
- Skeletons while loading
- Friendly empty state with tips to broaden filters
- Retry action on error

### Accessibility & Keyboard Navigation
- Semantic table and controls, proper labels and roles
- Tab-navigation across filters and rows, Enter to open details, Esc to close

---

## Features

- Server-side pagination (page, pageSize) with total count
- Server-side sorting (sortBy, sortOrder)
- Server-side filters (type[], status[], role[], q, userId, ip, ua, dateFrom, dateTo)
- Debounced free-text search
- Shareable URLs (all state in query params)
- Export (CSV/JSON) of the filtered set (paginated stream to avoid timeouts)
- Copy-to-clipboard actions
- Persistent column visibility and page size (localStorage)

---

## API Design

### List Endpoint
- Route: `GET /api/admin/audit-logs`
- Query params:
  - page (number, default 1), pageSize (number, default 25, max 200)
  - sortBy (timestamp|eventType|status|role|name|userIdentifier), sortOrder (asc|desc)
  - q (free-text)
  - eventType (comma-separated), status (comma-separated), role (comma-separated)
  - userId, ip, ua (string)
  - dateFrom, dateTo (ISO8601)
- Response:
  - data: LogRecord[]
  - page, pageSize, total, totalPages
  - aggregates: { byType: { [type]: count }, failures: number }

### Export Endpoint
- Route: `GET /api/admin/audit-logs/export`
- Query: same as list, plus `format=csv|json`
- Behavior:
  - Streams the filtered dataset (server-chunked) up to a sane cap (e.g., 50k rows) with backpressure.
  - Includes a `Content-Disposition` filename containing the date range and applied filters.

### Security
- Admin-only access; server validates session/role.
- Strict input validation and sanitization for all query params (whitelists for enums, ISO dates, safe numbers).
- Rate limiting and basic abuse protection (per-IP limits) on export endpoints.

---

## Frontend Architecture

### Files & Components (proposed)
- `src/app/admin/audit-logs/page.js` — page shell, SSR gate, search params parsing
- `components/admin/audit-logs/AuditLogsTable.jsx` — table w/ virtualization, sorting, selection
- `components/admin/audit-logs/Filters.jsx` — toolbar filters (controlled by URL params)
- `components/admin/audit-logs/DetailsDrawer.jsx` — slide-over with full log details
- `components/admin/audit-logs/Stats.jsx` — quick aggregates and sparkline charts
- `components/admin/audit-logs/ExportButton.jsx` — export UX (CSV/JSON)

### State & Data Fetching
- All state mirrored to URL query params for shareability and back/forward navigation.
- Data fetched via `/api/admin/audit-logs`; use React Query or SWR (consistent with existing patterns) for caching and refetch.
- Debounce free-text input; fire only on change or filter commit.
- Use skeleton loaders and optimistic UI for sort/filter transitions.

### Performance
- Server-side pagination; only fetch the current page.
- Row virtualization for tables with many rows.
- Avoid N+1 Airtable requests; use batched queries.
- Aggressive memoization of table rows and cells.
- Gzip/ Brotli responses, ETag on GETs for short-term cache friendliness.

---

## Security & Privacy
- Admin-only route (reuse existing admin auth/middleware).
- Mask IP by default (e.g., `192.168.***.***`) with reveal action guarded by role check.
- Never expose internal error traces to the client; show friendly messages.
- Validate and clamp page/pageSize to prevent large scans; cap export rows.

---

## Telemetry & Observability
- Log API errors as `Event Type = Server` to the same table to close the loop.
- Add perf logs for slow queries and export durations (internal logs, not user-visible).

---

## Testing Strategy
- Unit: query param parsing, validators, CSV serializer, masking util, sorting/filters helpers.
- Integration: API contract (list/export) happy-path and edge cases.
- E2E: filter combinations, pagination, export, detail view, URL sharing, RBAC.

---

## Accessibility
- Ensure all interactive controls have labels; table is screen-reader friendly.
- High-contrast states for severity (Status); no color-only cues.

---

## Rollout Plan
1) Build API list endpoint with validations, pagination, and aggregates.
2) Implement page skeleton with table and minimal filters.
3) Add detail drawer, advanced filters, virtualization.
4) Implement export endpoint and UI.
5) Add quick stats and small charts.
6) Wire into Admin sidebar and permissions.
7) QA, E2E tests, performance pass, and docs update.

---

## Risks & Mitigations
- Airtable rate limits: batch requests, cache results where possible, debounce filters, cap export size.
- Large datasets: enforce server-side paging, virtualization, and streaming exports.
- PII exposure: mask IP/UA by default, RBAC checks for reveals and exports.

---

## Acceptance Criteria (MVP)
- Admin can view a paginated, sortable table of logs with time range and facet filters.
- Keyword search works across Name, Message, and User Agent.
- Detail drawer shows the full record; copy actions function.
- Export current filtered set to CSV and JSON with caps and rate limits.
- URL reflects state; sharing a link restores the same view.
- Route is protected to Admins only.

---

## Nice-to-Haves (Post-MVP)
- Timeline view with grouped clusters and day separators.
- Saved filter presets per user.
- Alerting rules (e.g., notify on spikes in `Error/Failure`).
- Inline charts for top event types and hourly histogram.


