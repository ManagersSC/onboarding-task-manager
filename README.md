# Smile Cliniq — Onboarding Task Manager

A Next.js web app for managing the full Smile Cliniq hiring and onboarding workflow. Admins manage candidates, assign tasks, and send communications. New hires log in to complete tasks, upload documents, and take quizzes.

## Stack

- **Framework:** Next.js 15 (App Router)
- **Database:** Airtable
- **Auth:** iron-session (cookie-based)
- **UI:** Radix UI + Tailwind CSS + shadcn/ui
- **Automations:** Make.com (email, Slack notifications)
- **Deployment:** Vercel

## Getting Started

```bash
npm install
npm run dev      # http://localhost:3000
```

Copy `.env.local.example` to `.env.local` and fill in the required variables (Airtable, session secret, Google OAuth, Make.com webhooks).

## Commands

```bash
npm run dev        # Development server
npm run build      # Production build
npm run lint       # ESLint with --fix
npm test           # Run all tests
```

## Documentation

Full documentation (architecture, automations, operations manual) lives at `/docs` when the app is running, or in `public/docs/`.

## Environment Variables

See `CLAUDE.md` for the full list of required and optional environment variables.
