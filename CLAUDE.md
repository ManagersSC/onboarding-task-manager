# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Smile Clinique Onboarding Task Manager - a Next.js 15 application for managing dental clinic onboarding workflows. Uses Airtable as the database backend and integrates with Google Calendar.

## Rules

### Task Workflow

Follow this workflow for EVERY task the user prompts:

**Step 1 — Break down the task**
- Analyze the user's request and decompose it into clear, atomic sub-tasks.
- Present the sub-task list to the user for confirmation before proceeding.

**Step 2 — Branch decision**
- ALWAYS ask the user: "Do you want to implement this in a new git branch?"
- If **yes**: create a descriptively named branch from the current branch (e.g., `feat/add-quiz-timer`, `fix/login-redirect`) and switch to it.
- If **no**: stay on the current branch.

**Step 3 — Create a task tracking file**
- Create a markdown file in the project root named after the task (e.g., `TASK-add-quiz-timer.md`).
- List every sub-task with an unchecked checkbox (`- [ ]`).
- Include a header with the branch name (if applicable) and a brief description.

**Step 4 — Implement and track progress**
- Work through each sub-task one at a time.
- After completing each sub-task:
  1. Check off the corresponding checkbox in the task file (`- [x]`).
  2. Stage, commit, and push the changes to the appropriate branch (new branch or current branch based on Step 2).
  3. Use clear, descriptive commit messages referencing the sub-task.

**Step 5 — Wrap up**
- Once all sub-tasks are complete, ask the user: "All tasks are done. Would you like me to open a Pull Request for this branch?"
- This is only relevant when working on a new branch.
- If **yes**: create a PR using `gh pr create` with:
  - A concise title summarizing the work.
  - A body containing a summary of changes, the completed task list, and a test plan.
- If **no**: inform the user the work is complete and the branch is ready.


## Commands

```bash
# Development
npm run dev          # Start development server on localhost:3000

# Build & Production
npm run build        # Build for production
npm start            # Start production server

# Linting
npm run lint         # Run ESLint with --fix

# Testing
npm test                          # Run all tests
npm test -- <pattern>             # Run specific test (e.g., npm test -- start-onboarding)
npm run test:watch                # Watch mode
npx jest --config jest.config.cjs # Run Jest directly (always use this config)
```

## Architecture

### Tech Stack
- **Framework**: Next.js 15 (App Router)
- **UI**: Radix UI primitives + Tailwind CSS + shadcn/ui components
- **Database**: Airtable (via `airtable` npm package)
- **Auth**: iron-session for cookie-based sessions, bcryptjs for password hashing
- **State**: SWR for data fetching, React hooks for local state
- **Forms**: react-hook-form + zod validation
- **Notifications**: Sonner toast library

### Directory Structure
```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/               # API endpoints
│   │   ├── admin/         # Admin-only endpoints (users, tasks, applicants, quizzes)
│   │   └── ...            # Public endpoints (login, sign-up, notifications)
│   ├── admin/             # Admin dashboard pages
│   ├── dashboard/         # User dashboard pages
│   └── quizzes/           # Quiz taking pages
├── lib/
│   ├── airtable/client.js # Airtable connection (getAirtableBase())
│   ├── cache/             # Server-side caching utilities
│   ├── quiz/              # Quiz scoring and processing logic
│   ├── validation/        # Zod schemas
│   └── utils/             # Utility functions
└── hooks/                 # Custom React hooks (useApplicants, useNotifications, etc.)

components/
├── admin/                 # Admin-specific components (sidebar, user management)
├── dashboard/             # Dashboard components
├── onboarding/            # Onboarding flow components
├── quiz/                  # Quiz UI components
├── tasks/                 # Task-related components
└── ui/                    # shadcn/ui base components
```

### Authentication Flow
- Middleware (`src/middleware.js`) protects `/admin/*`, `/dashboard/*`, and `/api/*` routes
- Sessions are sealed/unsealed using iron-session with SESSION_SECRET
- Role-based access: `admin` role required for `/admin/*` routes
- Rate limiting: 30 req/min for auth endpoints, 300 req/min for other API routes

### Key Data Flow Patterns
1. **Airtable Access**: Always use `getAirtableBase()` from `src/lib/airtable/client.js`
2. **Quiz Identification**: Quiz tasks are identified by having a linked record in the `Onboarding Quizzes` field in `Onboarding Tasks Logs` table
3. **Task Completion**: Regular tasks use `/api/complete-task`, quizzes create submission records in `Onboarding Quiz Submissions` table

### User Roles
- **Admin**: Full system access, user management, task templates
- **Clinic Manager**: Clinic-specific task management, team oversight
- **Team Member**: Task execution, document submission

## Environment Variables

Required in `.env.local`:
- `AIRTABLE_API_KEY` - Airtable API key
- `AIRTABLE_BASE_ID` - Airtable base ID
- `JWT_SECRET` - JWT signing secret
- `SESSION_SECRET` - iron-session encryption secret
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_REFRESH_TOKEN` - Google Calendar integration

Optional:
- `MAKE_WEBHOOK_URL` - Webhook for integrations
- `BULK_DELETE_TEST_MODE` - Set to 'true' for test mode

## Airtable Tables

Key tables referenced in the codebase:
- `Applicants` - New hire records with onboarding status
- `Onboarding Tasks Logs` - Task assignments (links to `Assigned` applicant and optionally `Onboarding Quizzes`)
- `Onboarding Quizzes` - Quiz metadata
- `Onboarding Quiz Submissions` - Quiz completion records
- `Tasks` - Task templates with due dates

## Documentation

Project documentation lives in `docs/` directory. When creating new documentation, follow the pattern in existing files and place .md files appropriately within the docs structure.
