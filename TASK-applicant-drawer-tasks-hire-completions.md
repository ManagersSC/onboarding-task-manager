# Task: Applicant Drawer Tasks Section + Hire Completions Modal Improvements

**Branch:** `feat/applicant-drawer-tasks-hire-completions`

**Description:** Add task history/status visibility to the applicant drawer, clean up the hire completions modal by removing its history section, and show all actively onboarding hires in the modal regardless of task count.

---

## Sub-tasks

- [x] Create git branch `feat/applicant-drawer-tasks-hire-completions`
- [x] Remove history section from hire completions modal in `TaskManagement.js`
- [x] Show all actively onboarding hires in hire completions modal (even with 0 tasks)
- [x] Create `/api/admin/users/[id]/tasks` API endpoint
- [x] Create `useApplicantTasks` SWR hook
- [x] Add `useApplicantTasks` import to `applicant-drawer.js`
- [x] Add `ApplicantTasksSection` sub-component to `applicant-drawer.js`
- [x] Insert Tasks section JSX between Appraisals and Feedback Documents in drawer
- [x] Commit final changes and push branch
