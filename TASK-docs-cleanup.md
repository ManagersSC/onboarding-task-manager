# TASK: Docs Directory Cleanup

**Branch:** docs/handover
**Description:** Clean up the docs/ directory for client handover by deleting internal dev files and consolidating fragmented feature documentation.

---

## Sub-tasks

### Deletions
- [ ] Delete `docs/desktop.ini` — Windows system artifact
- [ ] Delete `docs/onboarding-tour.md` — Empty file (0 bytes)
- [ ] Delete `docs/CHANGELOG.md` — Essentially empty, redundant
- [ ] Delete `docs/UI_REDESIGN_TRACKER.md` — Internal dev task tracker
- [ ] Delete `docs/stages/` directory — Historical dev phase notes
- [ ] Delete `docs/changelog/` directory — Internal dev history

### Consolidations
- [ ] Merge `applicant-file-viewer-modal.md` + `applicant-file-viewer-improvements.md` + `applicant-file-viewer-modal-accessibility-fix.md` → `applicant-file-viewer.md`
- [ ] Merge `monthly-reviews-task.md` + `monthly-reviews-migration.md` + `monthly-review-deletion.md` → `monthly-reviews.md`
- [ ] Merge `bulk-create-resources.md` + `bulk-create-resources-link-validation.md` + `bulk-create-resources-realtime-validation.md` + `bulk-create-resources-session-clear-fix.md` → `bulk-create-resources.md`
- [ ] Merge `notifications-architecture.md` + `notifications-preferences-api.md` → `notifications.md`
- [ ] Merge `resource-hub-api.md` + `resource-hub-pagination.md` + `resource-filters.md` → `resource-hub.md`
- [ ] Merge `admin-invite-flow.md` + `admin-claim-complete-flow.md` → `admin-workflows.md`
- [ ] Merge `task-management.md` + `task-management-api.md` → `task-management.md`
- [ ] Merge `appraisal-questions-data-flow.md` + `custom-appraisal-questions.md` + `appraisal-doc-upload.md` → `appraisal-system.md`

### Wrap-up
- [ ] Update `docs/README.md` to reflect new structure
- [ ] Commit all changes
