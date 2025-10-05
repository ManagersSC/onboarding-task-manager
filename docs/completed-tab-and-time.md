# Completed Tasks UX split and Completed Time display

## Overview

We split the applicant dashboard into two sections to keep the UI focused on what needs attention while still making completed items accessible:

- Active: Assigned and Overdue items only
- Completed: Dedicated section listing all completed items, newest first

This avoids long completed columns filling the page and improves scannability.

## Key UI changes

- New section toggle buttons: "Active" and "Completed" in the dashboard toolbar.
- Active view no longer shows the Completed column in Kanban.
- Completed section renders a list of finished items sorted by completion time.

Files:
- `src/app/dashboard/page.js`: section split, data mapping, and sorting
- `components/TaskCard.js`: footer now shows "Completed <date/time>"

## Completed time source

We read completion timestamps from Airtable via API payloads. Priority:

1. `completedTime` (Onboarding Tasks Logs → "Completed Time")
2. `completedDate` (Tasks table → "Completed Date")
3. `lastStatusChange` (Onboarding Tasks Logs → "Last Status Change Time")

If none is present, the card renders a generic "Completed" label.

## Data mapping

In `page.js`, both quiz and regular tasks map completion time into `completedTime` so downstream components can rely on a single field. We also sort the Completed section by `completedTime` (fallbacks applied) descending.

## Developer notes

- Completed items are lazy-rendered within the Completed section only.
- Search and filters (type/week/urgency) apply to the Completed section as well.
- Preferences and pagination can be added in future if history grows large.


