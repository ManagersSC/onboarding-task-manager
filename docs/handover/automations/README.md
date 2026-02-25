# Make.com Automation Blueprints

> **This folder** contains exported Make.com scenario blueprints (JSON files) for all 7 automations used in the Smile Cliniq Onboarding Task Manager.
>
> These blueprints allow the automations to be re-imported into Make.com if they are ever lost, broken, or need to be moved to a new account.

---

## What's in This Folder

| File (to be added) | Scenario | Purpose |
|--------------------|----------|---------|
| `01-new-application-form.json` | New Application Form Intake | Receives new applicant form submissions and creates Airtable records |
| `02-admin-invite-email.json` | Admin Invite Email | Sends invitation email with one-time password setup link |
| `03-password-reset-email.json` | Password Reset Email | Sends secure single-use password reset link |
| `04-onboarding-start-notification.json` | Onboarding Start Notification | Notifies staff when a new hire's onboarding begins |
| `05-task-assignment-notification.json` | Task Assignment Notification | Notifies assignee when a task is assigned to them |
| `06-general-notifications.json` | General Notifications | Routes email and Slack notifications based on staff preferences |
| `07-custom-email.json` | Custom Email | Delivers custom admin-composed emails |

> **Note:** JSON blueprint files will be added here by the developer before the handover is complete.

---

## How to Re-Import a Blueprint

If a Make.com scenario is lost or broken, you can re-import it from the JSON file:

1. Log in to [make.com](https://make.com)
2. Go to your organization → **Scenarios**
3. Click **"Create a new scenario"**
4. In the scenario editor, click the **three-dot menu** (top right) → **"Import blueprint"**
5. Upload the relevant JSON file from this folder
6. Review the imported modules — you may need to reconnect:
   - Your email service account (Gmail, Mailgun, etc.)
   - Your Slack workspace
   - Your Airtable connection
7. Update the webhook URL if it changed — copy the new URL and update the corresponding environment variable in Vercel
8. Activate the scenario (toggle at the top of the scenario editor)

---

## How to Export a Blueprint (for updating this folder)

1. Log in to Make.com → open the scenario
2. Click the **three-dot menu** → **"Export blueprint"**
3. Save the JSON file
4. Name it following the pattern: `NN-short-name.json` (e.g. `03-password-reset-email.json`)
5. Commit to this folder in the repository

---

## Scenario Overview

### Scenario 1 — New Application Form Intake

- **Env var:** `MAKE_WEBHOOK_URL_NEW_APPLICATION_FORM`
- **Trigger:** External application form POSTs to Make.com webhook
- **Actions:** Create Airtable record → Send confirmation email to applicant → Notify admin
- **Test:** Submit the application form and verify a new Airtable record appears

---

### Scenario 2 — Admin Invite Email

- **Env var:** `MAKE_WEBHOOK_URL_ADMIN_PASSWORD_PAGE`
- **Trigger:** Admin invitation API call from Next.js app
- **Actions:** Send invitation email with password-setup link
- **Test:** Use "Invite Admin" in the app and check the email arrives with a working link

---

### Scenario 3 — Password Reset Email

- **Env var:** `MAKE_WEBHOOK_URL_RESET_PASSWORD`
- **Trigger:** Forgot-password form submission from Next.js app
- **Actions:** Send password reset email with secure link
- **Test:** Use "Forgot Password" on the login page and confirm email arrives

---

### Scenario 4 — Onboarding Start Notification

- **Env var:** `MAKE_WEBHOOK_URL_ONBOARDING_NOTIFICATION`
- **Trigger:** Task assignment triggers onboarding start in the app
- **Actions:** Send notification to relevant staff
- **Test:** Assign onboarding tasks to a test applicant

---

### Scenario 5 — Task Assignment Notification

- **Env var:** `MAKE_WEBHOOK_URL_TASK_ASSIGNMENT`
- **Trigger:** Task is assigned to a staff member in the app
- **Actions:** Send email/Slack notification to the assignee
- **Test:** Assign a task to a staff member and check their email/Slack

---

### Scenario 6 — General Notifications

- **Env var:** `MAKE_WEBHOOK_URL_NOTIFICATIONS`
- **Trigger:** Any notification event in the app (called from `src/lib/notifications.js`)
- **Actions:** Route to email or Slack based on `channel` field in payload
- **Test:** Trigger a system event — verify the notification reaches the right channel

---

### Scenario 7 — Custom Email

- **Env var:** `MAKE_WEBHOOK_URL_CUSTOM_EMAIL`
- **Trigger:** Admin sends a custom email via the admin panel
- **Actions:** Deliver the email with admin-provided subject and body
- **Test:** Use "Send Email" in the admin panel and verify delivery

---

## Verifying All Scenarios Are Active

A quick check after any account migration or re-import:

1. Log in to Make.com → Scenarios
2. Confirm all 7 scenarios are listed and **active** (toggle is green/on)
3. Check the **Last run** column — all scenarios should have run recently if the app is being used
4. Any scenario showing **"Error"** in its last run needs investigation — click it to see the error details

---

*For the full technical context, see the [TECHNICAL-OVERVIEW.md](../TECHNICAL-OVERVIEW.md).*
