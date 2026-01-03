# Admin Dashboard Performance

## Overview
This change reduces admin dashboard load time by minimizing Airtable round-trips, adding TTL caches, and streaming non-critical UI. Initial content appears fast with cached responses, while heavy panels load lazily.

## Key Changes
- Added aggregated endpoint: `/api/admin/dashboard/overview` (60s TTL, concurrency limit 3). It fetches:
  - Quick metrics
  - Activity feed (15 items)
  - New hires (top 25)
  - Resource hub (first page)
  - Tasks summary (grouped)
  - Notifications summary
- Refactored Airtable queries to avoid `.all()` and specify `fields`, `pageSize`, and pagination cursors.
- Updated dashboard to pass `initialData` into widgets and lazy-load heavier panels.
- Added tag-based revalidation on writes (tasks, new hire onboarding start).

## Data Flow
The page fetches the overview server-side, renders above-the-fold sections immediately, and defers heavy widgets.

## API Contracts
- GET `/api/admin/dashboard/overview`
  - Response:
    - `metrics`: object
    - `activities`: array
    - `newHires`: array
    - `resources`: `{ items, totalCount?, page, pageSize, nextCursor? }`
    - `tasks`: `{ upcoming, overdue, flagged }`
    - `notificationsSummary`: `{ totalUnread, latest }`

## Caching
- In-memory TTL caches (60s) in overview, quick-metrics, new-hires, resource-hub, and tasks endpoints.
- Revalidation tags on writes:
  - `dashboard:tasks` on task create
  - `dashboard:new-hires` on onboarding start

## UI Behavior
- `QuickMetrics`, `TaskManagement`, `ActivityFeed`, `NewHireTracker`, and `ResourceHub` accept `initialData` and hydrate client-side.
- `CalendarPreview` and `ResourceHub` are lazy-loaded via `next/dynamic` and wrapped in `Suspense`.

## Notes
- Search in ResourceHub now scans a limited number of pages for filename matches to avoid full-table scans.
- For further scale, consider Redis/Upstash for distributed caching, and precomputed metrics tables updated by webhooks.


