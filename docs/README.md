# Smile Cliniq Onboarding Task Manager

> **A modern onboarding and workflow automation platform for dental clinics.**

**Live URL:** [https://onboarding-task-manager.vercel.app](https://onboarding-task-manager.vercel.app)

---

## Table of Contents

### For the Client
- [Client Overview](./CLIENT_OVERVIEW.md) — Business summary and benefits
- [Usage Guide](./USAGE_GUIDE.md) — How to use the system
- [Workflows](./WORKFLOWS.md) — Automated workflows explained
- [FAQ](./FAQ.md) — Frequently asked questions

### Handover
- [Client Operations Manual](./handover/CLIENT-OPERATIONS-MANUAL.md) — Day-to-day operations reference
- [Technical Overview](./handover/TECHNICAL-OVERVIEW.md) — Architecture and system design
- [Security](./handover/SECURITY.md) — Auth, middleware, RBAC, and security model
- [Credentials Guide](./handover/CREDENTIALS-GUIDE.md) — Service credential delivery template
- [Delivery Plan](./handover/DELIVERY-PLAN.md) — Handover checklist
- [Automations](./handover/automations/README.md) — Make.com scenario blueprints

### Technical Reference
- [Setup & Installation](./SETUP.md)
- [Configuration](./CONFIGURATION.md) — Environment variables
- [Architecture](./architecture.md) — System diagrams
- [Development Guide](./DEVELOPMENT.md) — Coding standards and testing
- [Features](./features.md) — Full feature matrix
- [API Reference](./API_REFERENCE.md) — API endpoint index

### Feature Documentation
- [Task Management](./task-management.md)
- [Admin Workflows](./admin-workflows.md) — Invite flow, claim/complete flow
- [Resource Hub](./resource-hub.md) — Resource browsing, search, filters
- [Notifications](./notifications.md) — In-app notifications and preferences
- [Appraisal System](./appraisal-system.md) — Pre-appraisal questions and documents
- [Monthly Reviews](./monthly-reviews.md)
- [Applicant File Viewer](./applicant-file-viewer.md)
- [Bulk Create Resources](./bulk-create-resources.md)
- [Bulk Delete Applicants](./bulk-delete-applicants.md)
- [Bulk Delete Tasks](./bulk-delete-tasks.md)
- [Audit Logs](./audit-logs-page.md)
- [Quizzes](./admin-quizzes.md) — Quiz management
- [New Hire Tracker](./new-hire-tracker-api.md)
- [Server-Side Caching](./server_side_caching.md)

---

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI**: Radix UI + Tailwind CSS + shadcn/ui
- **Database**: Airtable
- **Auth**: iron-session (cookie-based)
- **Automations**: Make.com
- **Hosting**: Vercel
