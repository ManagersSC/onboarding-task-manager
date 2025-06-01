# Workflows

[← Back to Configuration](./CONFIGURATION.md)

## Key Automated Workflows

### 1. New Hire Onboarding
- **Trigger:** Admin assigns onboarding tasks to a new hire
- **Steps:**
  1. Admin logs in and creates/assigns tasks
  2. New hire receives tasks in dashboard
  3. New hire completes tasks and uploads documents
  4. Admin/manager reviews and marks as complete
- **Expected Result:** New hire is fully onboarded, all tasks tracked
- **Troubleshooting:**
  - If tasks do not appear, refresh dashboard or contact support
- **Manual Trigger:** Admin can reassign or add tasks at any time

### 2. Document Collection & Verification
- **Trigger:** Task requires document upload
- **Steps:**
  1. Team member uploads document
  2. Admin/manager reviews and approves
- **Expected Result:** Document is stored and status updated
- **Troubleshooting:**
  - If upload fails, check file type/size or retry

### 3. Calendar Event Scheduling
- **Trigger:** Admin schedules onboarding event
- **Steps:**
  1. Admin creates event in dashboard
  2. Google Calendar invite sent to attendees
- **Expected Result:** Event appears in all calendars
- **Troubleshooting:**
  - If invite not received, check spam or Google API credentials

### 4. Task Completion & Audit Logging
- **Trigger:** Team member marks task as complete
- **Steps:**
  1. Team member clicks 'Complete' on a task
  2. System logs action in audit log
- **Expected Result:** Task status updated, action logged
- **Troubleshooting:**
  - If status does not update, refresh or contact support

---

[Usage Guide →](./USAGE_GUIDE.md) 