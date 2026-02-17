# Handover Documentation Site - Implementation Plan

**Project**: Smile Clinique Onboarding Task Manager
**Deadline**: February 28, 2026
**Audience**: Non-technical dental clinic staff + future developers

---

## Context

The Smile Clinique Onboarding Task Manager project ends Feb 28, 2026. The client is non-technical and needs a clear, navigable reference covering the full system: the web app, Airtable database, Make.com automations, Vercel hosting, and Google Calendar integration. If something breaks, they'll call a developer — so the docs must serve both as an operator guide and a developer onboarding resource.

There are already 50+ markdown docs in `docs/`, but they're developer-focused. The gap is operator-friendly content and integration documentation (especially Make.com).

---

## Approach: Nextra Static Docs Site

**Why Nextra**: Next.js-based (familiar tooling), built-in search, MDX support, deploys to Vercel in minutes. Clean, professional look out of the box.

**Deployment**: Separate Vercel project at a subdomain (e.g., `docs-smile-clinique.vercel.app`), independent from the main app.

---

## Site Structure

```
Home (system overview + quick links)
│
├─ For Operators
│   ├─ Getting Started (login, roles, dashboard overview)
│   ├─ Daily Operations (managing hires, assigning tasks, documents)
│   ├─ Common Tasks (step-by-step walkthroughs with screenshots)
│   ├─ Troubleshooting (top 10 issues + when to call a developer)
│   └─ FAQ
│
├─ System Integrations
│   ├─ Airtable (what it stores, how to access, key tables)
│   ├─ Make.com Automations (all 7 scenarios documented)
│   ├─ Vercel Hosting (status, deployments, rollbacks, env vars)
│   └─ Google Calendar (setup, credentials, troubleshooting)
│
├─ For Developers
│   ├─ Architecture (migrated from architecture.md)
│   ├─ Development Setup (from SETUP.md + CONFIGURATION.md)
│   ├─ API Reference (from API_REFERENCE.md)
│   ├─ Database Schema (generated from ATS_schema.json)
│   └─ Feature Docs (migrated from existing docs/)
│
└─ Appendix
    ├─ Changelog
    ├─ Support Contacts
    └─ Credentials & Access Guide
```

---

## Implementation Steps

### Phase 1: Project Setup (Day 1-2)

- [ ] Create Nextra docs project in a new directory alongside the main project
- [ ] Configure `theme.config.jsx` with Smile Clinique branding
- [ ] Create all page files (empty MDX templates with headings)
- [ ] Deploy to Vercel as a separate project
- [ ] Create a migration script to copy existing docs into Nextra structure

### Phase 2: Migrate Existing Content (Day 3-4)

**Reuse directly** (minimal edits):
- [ ] `docs/API_REFERENCE.md` → developers/api-reference
- [ ] `docs/architecture.md` → developers/architecture
- [ ] `docs/features.md` → developers/features
- [ ] `docs/SETUP.md` + `docs/CONFIGURATION.md` → developers/setup
- [ ] `docs/admin-quizzes.md` → developers/features/quizzes
- [ ] `docs/task-management.md` → developers/features/tasks
- [ ] `docs/notifications-architecture.md` → developers/features/notifications
- [ ] `docs/changelog/*` → appendix/changelog

**Adapt** (rewrite for non-technical audience):
- [ ] `docs/CLIENT_OVERVIEW.md` → operators/getting-started
- [ ] `docs/WORKFLOWS.md` → operators/common-tasks
- [ ] `docs/FAQ.md` → operators/faq

**Generate from data**:
- [ ] `docs/ATS_schema.json` → developers/database-schema (script to produce readable markdown tables)

### Phase 3: Create New Content (Day 5-9)

**Operator guides** (write fresh, screenshot-heavy):
- [ ] Getting Started: login flow, dashboard tour, understanding roles
- [ ] Daily Operations: managing new hires, task assignment, document uploads, quiz management
- [ ] Common Tasks: step-by-step for the 8-10 most frequent workflows
- [ ] Troubleshooting: top 10 issues with solutions

**Integration docs** (write fresh, highest priority):

- [ ] **Make.com Automations** — document all 7 webhook scenarios:
  1. `MAKE_WEBHOOK_URL_NEW_APPLICATION_FORM` — new applicant intake
  2. `MAKE_WEBHOOK_URL_ADMIN_PASSWORD_PAGE` — admin invite flow
  3. `MAKE_WEBHOOK_URL_RESET_PASSWORD` — password reset emails
  4. `MAKE_WEBHOOK_URL_ONBOARDING_NOTIFICATION` — onboarding start
  5. `MAKE_WEBHOOK_URL_TASK_ASSIGNMENT` — task assignment notifications
  6. `MAKE_WEBHOOK_URL_NOTIFICATIONS` — general notifications (email/Slack)
  7. `MAKE_WEBHOOK_URL_CUSTOM_EMAIL` — custom email sending

  For each: what triggers it, what data is sent, what Make.com does with it, how to verify it's working.

- [ ] **Airtable**: table purposes in plain language, how to access, key relationships
- [ ] **Vercel**: accessing dashboard, checking deployments, managing env vars, rolling back
- [ ] **Google Calendar**: what it does, OAuth credentials, troubleshooting

### Phase 4: Visual Assets (Day 10-11)

- [ ] Take 12+ screenshots from the live app (admin dashboard, task management, quiz interface, user management, etc.)
- [ ] Create Mermaid diagrams: system architecture, data flow, auth flow, task lifecycle, Make.com webhook flows
- [ ] Generate database schema diagram from ATS_schema.json
- [ ] Annotate screenshots with callouts

### Phase 5: Polish & Launch (Day 12-13)

- [ ] Test all internal links and search
- [ ] Mobile responsiveness check
- [ ] Add support contacts and credentials access guide
- [ ] Client walkthrough (live demo)
- [ ] Final deploy

---

## Content Strategy

| Source | Destination | Action |
|--------|------------|--------|
| `docs/API_REFERENCE.md` | developers/api-reference | Copy as-is |
| `docs/architecture.md` | developers/architecture | Copy as-is |
| `docs/features.md` | developers/features | Copy as-is |
| `docs/SETUP.md` + `docs/CONFIGURATION.md` | developers/setup | Merge |
| `docs/admin-quizzes.md` | developers/features/quizzes | Copy as-is |
| `docs/task-management.md` | developers/features/tasks | Copy as-is |
| `docs/notifications-architecture.md` | developers/features/notifications | Copy as-is |
| `docs/changelog/*` | appendix/changelog | Compile |
| `docs/CLIENT_OVERVIEW.md` | operators/getting-started | Rewrite for non-technical |
| `docs/WORKFLOWS.md` | operators/common-tasks | Rewrite with screenshots |
| `docs/FAQ.md` | operators/faq | Expand |
| `docs/ATS_schema.json` | developers/database-schema | Generate via script |
| *New* | operators/daily-operations | Write fresh |
| *New* | operators/troubleshooting | Write fresh |
| *New* | integrations/make-automations | Write fresh (critical) |
| *New* | integrations/airtable | Write fresh |
| *New* | integrations/vercel | Write fresh |
| *New* | integrations/google-calendar | Write fresh |

---

## Key Files to Reference During Implementation

| Purpose | File |
|---------|------|
| Project overview | `CLAUDE.md` |
| Feature docs | `docs/features.md` |
| Airtable schema | `docs/ATS_schema.json` |
| API reference | `docs/API_REFERENCE.md` |
| Architecture | `docs/architecture.md` |
| Client overview | `docs/CLIENT_OVERVIEW.md` |
| Workflows | `docs/WORKFLOWS.md` |
| Webhook example | `docs/add-applicants-webhook-integration.md` |
| Make.com usage in code | `src/lib/notifications.js` |
| Env vars (webhook URLs) | `.env.local` |

---

## Verification Checklist

- [ ] `npm run dev` on the Nextra project — all pages render correctly
- [ ] Deploy preview on Vercel — search works, navigation works, images load
- [ ] Non-technical person test: can they find how to add a new hire without developer help?
- [ ] Developer test: can they set up a local dev environment using only the docs?
- [ ] All 7 Make.com scenarios are documented with enough detail to debug failures

---

## Timeline Summary

| Days | Phase | Focus |
|------|-------|-------|
| 1-2 | Setup | Nextra project, Vercel deploy, page structure |
| 3-4 | Migrate | Copy/adapt existing 50+ docs |
| 5-9 | Create | Operator guides, Make.com docs, integration guides |
| 10-11 | Visuals | Screenshots, Mermaid diagrams, schema diagram |
| 12-13 | Polish | Link testing, mobile check, client walkthrough, launch |

**Estimated effort**: ~65 hours over 13 days (~5 hours/day)
