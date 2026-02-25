# Technical Overview — Smile Cliniq Onboarding Task Manager

> **Audience:** Developer inheriting or maintaining this project
> **Last updated:** February 2026
> **See also:** [SECURITY.md](./SECURITY.md) for security implementation details

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Tech Stack](#2-tech-stack)
3. [Data Flow](#3-data-flow)
4. [Make.com Automation Inventory](#4-makecom-automation-inventory)
5. [Airtable Schema](#5-airtable-schema)
6. [Environment Variables](#6-environment-variables)
7. [Deployment](#7-deployment)
8. [Local Development Setup](#8-local-development-setup)
9. [Key File Locations](#9-key-file-locations)
10. [Known Limitations](#10-known-limitations)

---

## 1. System Architecture

The platform is made up of **two distinct systems** that share the same Airtable database:

1. **ATS / Hiring Pipeline** — lives entirely in Airtable. Managed directly by the team in Airtable. Uses Airtable automations to trigger Make.com scenarios.
2. **Onboarding Task Manager** — the Next.js web app on Vercel. Used by admins and new hires. Triggers Make.com scenarios via environment variable webhook URLs.

```
┌──────────────────────────────────────────────────────────────────┐
│                         AIRTABLE                                 │
│           Base ID: appZ4QT8rXFlX6LrZ                            │
│    Tables: Applicants, Jobs, Staff, Feedback, Documents,        │
│            Onboarding Tasks, Quizzes, Notifications, etc.       │
│                                                                  │
│  ┌───────────────────────────────────────────┐                  │
│  │  Airtable Automations (Change Stage group)│──── webhook ──┐  │
│  │  New Applicant, Send Interview Invite,    │               │  │
│  │  Changes in Stage, Feedback Submission,   │               │  │
│  │  Document Submission, Week Change, etc.   │               │  │
│  └───────────────────────────────────────────┘               │  │
└──────────────────┬───────────────────────────────────────────┘  │
                   │  Airtable API (read/write)                   │
                   ▼                                              ▼
┌──────────────────────────────┐    ┌──────────────────────────────────┐
│  ONBOARDING APP (Next.js)    │    │    MAKE.COM (10 scenarios)       │
│  Vercel • App Router         │    │  Hiring (Airtable-triggered):    │
│  onboarding.smilecliniq.com  │    │    H1  New Applicant             │
│                              │    │    H2  First Interview Invite    │
│  Auth / Tasks / Quizzes /    │    │    H3  Changes in Status         │
│  Notifications / Documents   │    │  Onboarding (app-triggered):     │
│                              │    │    1-7 via MAKE_WEBHOOK_URL_*    │
└──────────────┬───────────────┘    │                                  │
               │  webhook POST      │  → Gmail (recruitment@)          │
               └──────────────────▶│  → Slack (Recruitment Bot)       │
                                    └──────────────────────────────────┘
```

> 📸 **Screenshot:** _High-level architecture: Airtable interface, web app dashboard, and Make.com scenario list side by side_

---

### Two Airtable contexts to be aware of

| Context | Where it lives | Who uses it |
|---------|---------------|-------------|
| **ATS / Hiring** | Airtable — `Applicants`, `Jobs`, `Feedback`, `Documents` tables | Team manages directly in Airtable |
| **Onboarding App** | Airtable — `Onboarding Tasks Logs`, `Quizzes`, `Notifications` tables + Next.js web app | Admins via web UI, new hires via their dashboard |

Both share the same Airtable base (`appZ4QT8rXFlX6LrZ`). The web app's `AIRTABLE_BASE_ID` env variable points to this base.

---

## 2. Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 15 (App Router) | All pages in `src/app/`, API routes in `src/app/api/` |
| UI | Radix UI + Tailwind CSS + shadcn/ui | Component library in `components/ui/` |
| Database | Airtable | NOT a traditional SQL DB — schema lives in Airtable cloud |
| Auth | iron-session + bcryptjs | Encrypted cookie sessions, 8-hour TTL |
| State / data fetching | SWR | Client-side data fetching with caching |
| Forms | react-hook-form + zod | Validation schemas in `src/lib/validation/` |
| Notifications (UI) | Sonner | Toast library |
| Hosting | Vercel | Auto-deploys from `main` branch |
| Automations | Make.com | 10 scenarios — 3 triggered by Airtable (hiring), 7 triggered by the web app (onboarding) |
| Calendar | Google Calendar API | OAuth 2.0 with refresh token |

---

## 3. Data Flow

### Standard request cycle

```
User action in browser
  → Next.js page (client component)
  → SWR fetches /api/some-endpoint
  → API route unseals iron-session cookie
  → API route validates input (Zod)
  → API route queries Airtable
  → (if notification needed) API route POSTs to Make.com webhook
  → Make.com sends email/Slack message
  → API route returns JSON to client
  → SWR updates UI
```

### Notification routing (src/lib/notifications.js)

```
triggerNotification(event, staffId, data)
  → Creates record in Airtable Notifications table (in-app)
  → Checks Staff.Notification Preferences for this event type
  → Checks Staff.Notification Channels (Email / Slack)
  → If Email enabled → POST to MAKE_WEBHOOK_URL_NOTIFICATIONS
  → If Slack enabled → POST to MAKE_WEBHOOK_URL_NOTIFICATIONS (different payload)
```

---

## 4. Make.com Automation Inventory

> **Full automation documentation** — including step-by-step flow, exact payloads, email templates, Slack setup, debugging guide, and reconnection instructions — is in the dedicated **[Make.com Automations](automations)** page.
>
> Blueprint JSON exports (for re-import) are in `docs/handover/automations/`.

Quick reference — **10 total scenarios:**

### Hiring Phase Scenarios (Airtable-triggered)

Webhook URLs for these are stored inside the Airtable automation scripts — not in Vercel env vars.

| # | Scenario | Blueprint File | Triggered by |
|---|----------|---------------|--------------|
| H1 | New Applicant | `applications/NEW_APPLICANT.json` | Airtable "New Applicant" automation |
| H2 | Send First Interview Invite | `applications/SEND_FIRST_INTERVIEW_INVITE.json` | Airtable "Send First Interview Invite" automation |
| H3 | Changes in Status | `applications/CHANGES_IN_STATUS.json` | Airtable "Changes in Stage" automation |

### Onboarding Scenarios (App-triggered)

Webhook URLs are stored as `MAKE_WEBHOOK_URL_*` env variables in Vercel.

| # | Scenario | Env Variable | Triggered from |
|---|----------|-------------|----------------|
| 1 | Application Form Email | `MAKE_WEBHOOK_URL_NEW_APPLICATION_FORM` | External / admin action |
| 2 | Admin Invite Email | `MAKE_WEBHOOK_URL_ADMIN_PASSWORD_PAGE` | `api/admin/invite-admin` |
| 3 | Password Reset Email | `MAKE_WEBHOOK_URL_RESET_PASSWORD` | `api/forgot-password` |
| 4 | Onboarding Start Notification | `MAKE_WEBHOOK_URL_ONBOARDING_NOTIFICATION` | `api/admin/start-onboarding` |
| 5 | Task Assignment Notification | `MAKE_WEBHOOK_URL_TASK_ASSIGNMENT` | Task assignment API |
| 6 | General Notifications (Email + Slack) | `MAKE_WEBHOOK_URL_NOTIFICATIONS` | `src/lib/notifications.js` |
| 7 | Custom Email | `MAKE_WEBHOOK_URL_CUSTOM_EMAIL` | `api/admin/send-email` |

See the [Make.com Automations](automations) page for the full reference.

---

## 5. Airtable Schema

> The full machine-readable schema is in `docs/ATS_schema.json`.

### Core Tables

#### Applicants
Stores every new hire from application through to onboarding completion.

| Field | Type | Purpose |
|-------|------|---------|
| Email | Email | Primary identifier — must be unique |
| Name | Text | Full name |
| Status | Single select | Onboarding stage (New Application → Hired → Onboarding → Complete) |
| Reset Nonce | Text | Single-use token for password reset (cleared after use) |
| CV, Passport, DBS, etc. | Attachment | Uploaded onboarding documents |

**Status options (onboarding stages):**
- New Application
- First Interview Invite Sent
- First Interview Booked
- Interview Cancelled / Rescheduled
- Under Review
- Hired → Onboarding stages → Complete

---

#### Onboarding Tasks Logs
Records every task assigned to every applicant.

| Field | Type | Purpose |
|-------|------|---------|
| Assigned | Link to Applicants | Which hire this task belongs to |
| Task | Link to Tasks | Which task template |
| Status | Single select | Pending / In Progress / Complete |
| Onboarding Quizzes | Link to Onboarding Quizzes | If set, this is a quiz task |
| Due Date | Date | When the task is due |
| Completed At | Date | When it was completed |

**Key pattern:** A task log record with a linked `Onboarding Quizzes` record is a quiz task — the app uses this to render quiz UI instead of a standard task completion button.

---

#### Tasks
Task templates that can be assigned to any hire.

| Field | Type | Purpose |
|-------|------|---------|
| Name | Text | Task name |
| Description | Long text | What the hire needs to do |
| Due Date | Number | Days from assignment (relative due date) |

---

#### Staff
Admin and clinic manager accounts.

| Field | Type | Purpose |
|-------|------|---------|
| Email | Email | Login identifier |
| Name | Text | Display name |
| Role | Single select | admin / user |
| Password Hash | Text | bcrypt hash — never expose client-side |
| Notification Preferences | Multi-select | Which event types trigger notifications |
| Notification Channels | Multi-select | Email / Slack |
| Invite Nonce | Text | Single-use token for admin invite (cleared after use) |

---

#### Onboarding Quizzes
Quiz definitions.

| Field | Type | Purpose |
|-------|------|---------|
| Name | Text | Quiz title |
| Questions | Long text (JSON) | Question definitions |
| Pass Score | Number | Minimum score to pass |

---

#### Onboarding Quiz Submissions
Records each quiz attempt.

| Field | Type | Purpose |
|-------|------|---------|
| Applicant | Link to Applicants | Who took the quiz |
| Quiz | Link to Onboarding Quizzes | Which quiz |
| Score | Number | Achieved score |
| Answers | Long text (JSON) | Submitted answers |
| Submitted At | Date | Timestamp |

---

#### Notifications
In-app notification records.

| Field | Type | Purpose |
|-------|------|---------|
| Recipient | Link to Staff | Who the notification is for |
| Type | Single select | Notification type |
| Message | Text | Notification body |
| Read | Checkbox | Whether the user has seen it |
| Created At | Date | Timestamp |

---

#### Website Audit Log
Every significant user action is logged here.

| Field | Type | Purpose |
|-------|------|---------|
| Action | Text | What happened |
| User | Text | Who did it |
| Timestamp | Date | When |
| Details | Long text | Additional context (JSON) |

---

### Critical Warning: Don't Rename Airtable Fields

The app references Airtable field names as strings throughout the codebase. If you rename a field in Airtable, the app will break silently. **Always update the code when renaming Airtable fields.**

> 📸 **Screenshot:** _Airtable base showing the key tables in the left sidebar (Applicants, Jobs, Staff, Onboarding Tasks Logs, Quizzes, Notifications, Website Audit Log)_

> 📸 **Screenshot:** _Airtable Applicants table open in grid view showing the key fields (Name, Email, Stage, Interviewer, Onboarding Manual Import, etc.)_

---

## 6. Environment Variables

Set these in Vercel → Project Settings → Environment Variables.

| Variable | Required | Purpose |
|----------|----------|---------|
| `AIRTABLE_API_KEY` | Yes | Airtable API access key |
| `AIRTABLE_BASE_ID` | Yes | The Airtable base identifier |
| `SESSION_SECRET` | Yes | iron-session cookie encryption (32+ characters) |
| `JWT_SECRET` | Yes | JWT signing key for password reset / invite tokens |
| `APP_BASE_URL` | Yes (prod) | App URL — used for CORS and invite links (e.g. `https://onboarding.smilecliniq.com`) |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Yes | Google OAuth redirect URI |
| `GOOGLE_REFRESH_TOKEN` | Yes | Long-lived Google refresh token |
| `MAKE_WEBHOOK_URL_NEW_APPLICATION_FORM` | Yes | Scenario 1 webhook URL |
| `MAKE_WEBHOOK_URL_ADMIN_PASSWORD_PAGE` | Yes | Scenario 2 webhook URL |
| `MAKE_WEBHOOK_URL_RESET_PASSWORD` | Yes | Scenario 3 webhook URL |
| `MAKE_WEBHOOK_URL_ONBOARDING_NOTIFICATION` | Yes | Scenario 4 webhook URL |
| `MAKE_WEBHOOK_URL_TASK_ASSIGNMENT` | Yes | Scenario 5 webhook URL |
| `MAKE_WEBHOOK_URL_NOTIFICATIONS` | Yes | Scenario 6 webhook URL |
| `MAKE_WEBHOOK_URL_CUSTOM_EMAIL` | Yes | Scenario 7 webhook URL |
| `BULK_DELETE_TEST_MODE` | No | Set to `true` to enable test mode for bulk delete endpoints |

**Actual values are in the [CREDENTIALS-GUIDE.md](./CREDENTIALS-GUIDE.md) — store and deliver securely.**

---

## 7. Deployment

### Where the app lives

- **Hosting:** Vercel
- **Production URL:** `https://onboarding.smilecliniq.com`
- **Vercel project:** See credentials guide for project name

### How deployments work

- Every push to the `main` branch triggers an automatic production deployment
- Every pull request gets a preview deployment URL
- No manual deployment steps needed

### Checking deployment status

1. Go to [vercel.com](https://vercel.com) and log in
2. Select the project
3. The **Deployments** tab shows all deployments with status (Ready / Error / Building)
4. Click any deployment to see build logs

> 📸 **Screenshot:** _Vercel dashboard showing the project's Deployments tab with recent deployments and their status (Ready / Building / Error)_

### Rolling back

1. Go to the **Deployments** tab
2. Find the last working deployment
3. Click the three-dot menu → **Promote to Production**
4. This takes effect in ~30 seconds

### Managing environment variables

1. Go to Vercel → Project → **Settings** → **Environment Variables**
2. Add, edit, or delete variables
3. **A redeployment is required for changes to take effect** — go to Deployments → click the latest deployment → Redeploy

---

## 8. Local Development Setup

See `docs/SETUP.md` for the full setup guide. Quick summary:

```bash
# Prerequisites: Node.js 18+, npm

# Clone the repo
git clone [repo-url]
cd onboarding-task-manager

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Fill in all values — see docs/CONFIGURATION.md for guidance

# Start development server
npm run dev
# → App runs at http://localhost:3000

# Run tests
npm test

# Lint
npm run lint
```

**For Airtable access in development:** Use the same Airtable base as production, or ask the client for a duplicate "dev" base to avoid touching live data.

**For Make.com in development:** Webhooks from your local machine will not reach Make.com unless you use a tunnel (e.g. `ngrok`). Set `MAKE_WEBHOOK_URL_*` vars to your ngrok URL during local testing.

---

## 9. Key File Locations

| What you're looking for | Where to find it |
|------------------------|-----------------|
| Airtable connection | `src/lib/airtable/client.js` |
| Notification system | `src/lib/notifications.js` |
| Session/auth middleware | `src/middleware.js` |
| Password validation | `src/lib/validation/password.js` |
| Airtable input sanitization | `src/lib/airtable/sanitize.js` |
| Quiz scoring logic | `src/lib/quiz/` |
| Rate limiter | `src/lib/rateLimiter.js` |
| Admin API routes | `src/app/api/admin/` |
| Public API routes | `src/app/api/` (non-admin) |
| Admin dashboard pages | `src/app/admin/` |
| User dashboard pages | `src/app/dashboard/` |
| Quiz pages | `src/app/quizzes/` |
| Shared components | `components/ui/` |
| Admin components | `components/admin/` |
| Task components | `components/tasks/` |
| Security implementation | `docs/handover/SECURITY.md` |
| API reference | `docs/API_REFERENCE.md` |
| Full architecture doc | `docs/architecture.md` |
| Airtable schema (JSON) | `docs/ATS_schema.json` |

---

## 10. Known Limitations

| Item | Risk | Notes |
|------|------|-------|
| In-memory rate limiting | Medium | Rate limiter uses a `Map` per serverless instance — not shared across instances. Distributed attackers can bypass it. Migrate to Upstash Redis when budget allows. |
| Airtable as primary DB | Medium | Airtable has API rate limits (5 req/sec). High traffic could hit these. The codebase uses server-side caching (`src/lib/cache/`) to mitigate. |
| No structured logging | Low | `console.log` is used in many places. Winston is installed but not consistently used. Logs are in Vercel function logs. |
| CSP uses unsafe-inline/unsafe-eval | Low | Required by Next.js client-side rendering. Cannot be removed without breaking the app. |
| Single Google refresh token | Medium | The Google Calendar integration uses a single hardcoded refresh token. If it expires, calendar features will break. Re-run the OAuth flow to get a new token. |

---

*For security-specific details, see [SECURITY.md](./SECURITY.md). For the client-facing guide, see [CLIENT-OPERATIONS-MANUAL.md](./CLIENT-OPERATIONS-MANUAL.md).*
