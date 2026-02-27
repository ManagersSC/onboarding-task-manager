# TASK: Assigned Tasks UX Overhaul

**Branch:** `feat/assigned-tasks-delete` (continuing on existing branch)
**Description:** Bring admin/assigned-tasks up to the same UX quality as the resources page. Full redesign to match TasksTable exactly: same filter toolbar layout, actions column, grouped-by-status view, row expansion, ChevronsUpDown sort indicators, Card wrapper with footer pagination.

## Sub-tasks

- [x] Update assigned-tasks API — add `status` + `hasDocuments` filters, return `status` field
- [x] Make FileViewerModal accept optional `attachmentsEndpoint` prop
- [x] Overhaul TableFilters — remove broken Name dropdown, add dynamic Folder, Status, Has Documents dropdowns with lazy loading + inline filter pills + Clear all
- [x] Upgrade sort indicators — replace ▲/▼ text with ChevronUp/ChevronDown icons, extract reusable SortIndicator
- [x] Add refresh button with Tooltip + loading spinner
- [x] Wire attachment viewer button → FileViewerModal
- [x] Add Status column + badge rendering + sortability
- [x] Replace "Open" text button with icon button + Tooltip
- [x] Update fetchLogs to pass status + hasDocuments + status sort field
- [x] Full table redesign — match TasksTable visual design (filter toolbar with inline pills + view toggle, Actions column, ExpandedLogDetail on row click, grouped-by-status view with collapse/expand, Card wrapper, Select per-page pagination, ChevronsUpDown inactive sort indicators)
- [x] Fix search formula — wrap multipleLookupValues fields (Applicant Name, Applicant Email, Folder Name) with ARRAYJOIN() so FIND()/LOWER() receive strings not arrays
- [x] Fix Status dropdown options to match actual Airtable schema (Assigned/Overdue/Completed/Scheduled) and update STATUS_STYLES accordingly
