/**
 * Canonical notification type strings.
 * These must match the values in:
 *   - Airtable: Notifications.Type field
 *   - Airtable: Staff.Notification Preferences field (multipleSelects)
 *
 * When adding a new type:
 *   1. Add a constant here
 *   2. Add the matching option to Staff → "Notification Preferences" in Airtable
 *      (Notifications.Type is a singleLineText — no schema change needed there)
 */
export const NOTIFICATION_TYPES = {
  // Task lifecycle
  TASK_ASSIGNMENT:               "Task Assignment",
  TASK_COMPLETION:               "Task Completion",
  TASK_UPDATE:                   "Task Update",
  TASK_DELETION:                 "Task Deletion",
  TASK_FLAGGED:                  "Task Flagged",
  TASK_FLAG_RESOLVED:            "Task Flag Resolved",
  TASK_FLAG_RESOLVED_COMPLETED:  "Task Flag Resolved & Completed",
  TASK_CLAIM_ALL:                "Task Claim-All Executed",

  // Documents
  DOCUMENT_UPLOAD:               "Document Upload",

  // Quizzes
  QUIZ_COMPLETION:               "Quiz Completion",
  QUIZ_FAILED:                   "Quiz Failed",

  // Applicant / onboarding
  APPLICANT_STAGE_UPDATED:       "Applicant Stage Updated",
  ONBOARDING_PAUSED:             "Onboarding Paused",
  ONBOARDING_RESUMED:            "Onboarding Resumed",
  ONBOARDING_STARTED:            "Onboarding Started",
  NEW_HIRE_ADDED:                "New Hire Added",

  // Admin
  ADMIN_INVITED:                 "Admin Invited",
  ADMIN_INVITE_ACCEPTED:         "Admin Invite Accepted",

  // Scheduling
  APPRAISAL:                     "Appraisal",
  MONTHLY_REVIEW:                "Monthly Review",
  MONTHLY_REVIEW_CANCELLED:      "Monthly Review Cancelled",

  // System
  ANNOUNCEMENT:                  "Announcement",
  CUSTOM:                        "Custom",
}
