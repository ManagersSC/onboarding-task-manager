# Smile Cliniq Onboarding Task Manager

**Replaced manual spreadsheet onboarding with a full-stack workflow platform** for a dental clinic — automating task assignment, document collection, staff notifications, and compliance logging across the entire new hire lifecycle.

**Live:** [onboarding.smilecliniq.com](https://onboarding.smilecliniq.com)

---

## What it does

New hire onboarding at a dental clinic involves a predictable but error-prone sequence: tasks assigned across roles, documents collected, quizzes passed, calendar events booked, managers notified at each step. This system replaces all of that manual coordination with a single platform that tracks every hire from application through to onboarding completion.

- **Admins** assign task templates and monitor all active onboardings from a single dashboard
- **Clinic managers** track their team's progress and review submitted documents
- **New hires** work through their personalised task list, upload documents, and take knowledge quizzes — all in one place

---

## Key features

**Task management** — Assign templated task checklists to any hire. Tasks have relative due dates, status tracking, and a full audit trail.

**Onboarding quizzes** — Admins create quizzes and assign them as tasks. Hires take them in the app; scores are calculated instantly using a partial-credit model that rewards correct answers and penalises guessing.

**Document collection** — Hires upload documents (CV, passport, DBS) directly. Admins verify and mark as received without leaving the platform.

**7 automated notification scenarios** — Every significant event (new application, task assigned, onboarding started, password reset, custom admin email) fires a Make.com webhook that routes to email or Slack based on each staff member's preferences.

**Google Calendar integration** — Interview scheduling and onboarding events sync directly to the clinic's calendar.

**Audit logs** — Every user action is logged with actor, timestamp, and context — ready for compliance review.

**Role-based access** — Admin, Clinic Manager, and Team Member roles each see only what they need. All routes and API endpoints are protected by middleware.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI | Radix UI + Tailwind CSS + shadcn/ui |
| Database | Airtable |
| Auth | iron-session (encrypted cookies, 8-hr TTL) + bcryptjs |
| Data fetching | SWR |
| Forms | react-hook-form + Zod |
| Automations | Make.com (7 webhook scenarios) |
| Calendar | Google Calendar API (OAuth 2.0) |
| Hosting | Vercel (auto-deploy from `main`) |

---

## Quick start

```bash
# Prerequisites: Node.js 18+

git clone <repo-url>
cd onboarding-task-manager
npm install

cp .env.example .env.local
# Fill in values — see docs/CONFIGURATION.md

npm run dev          # http://localhost:3000
npm test             # Run test suite
npm run lint         # Lint + auto-fix
```

See [docs/SETUP.md](docs/SETUP.md) for the full setup guide including Airtable base configuration and Google OAuth setup.

---

## Project structure

```
src/
├── app/
│   ├── api/           # API routes (admin/* protected, public endpoints)
│   ├── admin/         # Admin dashboard pages
│   ├── dashboard/     # New hire dashboard pages
│   └── quizzes/       # Quiz-taking pages
├── lib/
│   ├── airtable/      # DB client + input sanitisation
│   ├── quiz/          # Scoring logic
│   ├── notifications.js
│   └── rateLimiter.js
components/
├── admin/             # Admin-specific components
├── dashboard/         # Dashboard components
├── tasks/             # Task card, task list
└── ui/                # shadcn/ui base components
```

---

## Documentation

| | |
|---|---|
| [Setup & Installation](docs/SETUP.md) | Local dev, environment variables |
| [Architecture](docs/handover/TECHNICAL-OVERVIEW.md) | System design, data flow, Make.com scenarios |
| [API Reference](docs/API_REFERENCE.md) | All endpoints |
| [Features](docs/features.md) | Full feature matrix |
| [Security](docs/handover/SECURITY.md) | Auth model, RBAC, middleware |
| [Workflows](docs/WORKFLOWS.md) | Automated workflow walkthroughs |
| [Airtable Schema](docs/handover/TECHNICAL-OVERVIEW.md#5-airtable-schema) | Table definitions and field reference |
