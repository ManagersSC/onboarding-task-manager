# TASK: Assigned Tasks UX Overhaul

**Branch:** `feat/assigned-tasks-delete` (continuing on existing branch)
**Description:** Bring admin/assigned-tasks up to the same UX quality as the resources page. Fixes broken filters, adds Status column/filter, wires attachment viewer, improves sort indicators, adds refresh button.

## Sub-tasks

- [ ] Update assigned-tasks API — add `status` + `hasDocuments` filters, return `status` field
- [ ] Make FileViewerModal accept optional `attachmentsEndpoint` prop
- [ ] Overhaul TableFilters — remove broken Name dropdown, add dynamic Folder, Status, Has Documents dropdowns with lazy loading + inline filter pills + Clear all
- [ ] Upgrade sort indicators — replace ▲/▼ text with ChevronUp/ChevronDown icons, extract reusable SortIndicator
- [ ] Add refresh button with Tooltip + loading spinner
- [ ] Wire attachment viewer button → FileViewerModal
- [ ] Add Status column + badge rendering + sortability
- [ ] Replace "Open" text button with icon button + Tooltip
- [ ] Update fetchLogs to pass status + hasDocuments + status sort field
