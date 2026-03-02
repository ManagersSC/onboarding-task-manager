# Platform Overview

_Last updated: February 2026_

This page gives you the big picture of how Smile Cliniq's recruitment and onboarding systems fit together — what each tool does, how they connect, and the full journey from a candidate applying to completing their probation.

---

## Two Systems, One Journey

The platform is made up of two connected systems:

| System | Where it lives | What it's for |
|---|---|---|
| **Application Tracking System (ATS)** | Airtable | Managing job applicants — from their first application through to being hired |
| **Onboarding Task Manager** | Web app (onboarding-task-manager.vercel.app) | Managing a new hire's onboarding tasks, documents, quizzes, and progress after they're hired |

---

## The Full Candidate Journey

```
Candidate submits application form
        ↓
Record created in Airtable (ATS)
        ↓
[Hiring Phase — managed in Airtable]
  New Application
        ↓
  First Interview Invite Sent  ──→ Candidate books interview via Cal.com
        ↓
  Reviewed  ──────────────────────→ Interviewer submits feedback form
        ↓
  Second Interview Invite Sent ──→ Candidate books second interview
        ↓
  Reviewed (2nd)  ────────────────→ Interviewer submits feedback form
        ↓
  Hired  ──────────────────────────→ Welcome email + new starter documents sent
        ↓
[Onboarding Phase — managed in web app]
  Admin sets start date + clicks "Start Onboarding"
        ↓
  Week 1 tasks assigned automatically
        ↓
  Week-by-week tasks, quizzes, document uploads
        ↓
  End of Probation ────────────────→ Completion recorded
```

At any point, a candidate can be moved to **Rejected** or **Rejected – Liked** (flagged for future roles).

---

## What Each Tool Does

### Airtable
- **Single source of truth** for all applicant and staff data
- Hosts the ATS (hiring pipeline) and stores onboarding records
- Runs internal automations (e.g. stage changes, task assignments)
- Connects to Make.com via webhooks to send emails

### Make
- Handles all outbound emails (application confirmations, interview invites, hired emails, onboarding notifications, password resets)
- Acts as the messaging layer — Airtable and the web app trigger it via webhooks
- Contains ~10 active scenarios covering both hiring and onboarding

### Onboarding Task Manager (Web App)
- React/Next.js app hosted on Vercel
- Used by admins and staff to manage onboarding
- Tasks, quizzes, document uploads, notifications, audit logs
- Admin panel for user management and task templates

### Google Calendar / Cal.com
- Interviewers have Cal.com booking links stored in Airtable (Staff table)
- When an interview invite is sent, Make.com builds a personalised Cal.com link pre-filled with the candidate's name, email, and location
- Google Calendar is used by the web app for scheduling onboarding events

---

## How the Systems Connect

```
Airtable
  │
  ├─ Airtable Automations ──→ Make.com webhooks ──→ Emails (Gmail via recruitment@smilecliniq.com)
  │                                              └──→ Slack notifications
  │
  └─ Onboarding app reads/writes directly to Airtable via API
```

The web app never sends emails directly — all email delivery goes through Make.com. The app posts to Make.com webhook URLs (stored as environment variables on Vercel), and Make.com handles the actual sending.

---

## Key Contacts & Tools

| Tool | Purpose | Managed by |
|---|---|---|
| Airtable | Database + ATS | Client (owner of base) |
| Make.com | Automations + email delivery | Developer (transfer to client) |
| Vercel | Web app hosting | Developer (transfer to client) |
| Google Workspace | Email sending (recruitment@smilecliniq.com) | Client |
| Cal.com | Interview scheduling | Client (per-interviewer links) |

For detailed support contacts, see the [Operations Manual](operations-manual#10-who-to-contact).
