# Smile Clinique Onboarding Task Manager

> **A modern onboarding and workflow automation platform for dental clinics.**

---

**Live URL:** [https://onboarding-task-manager.vercel.app](https://onboarding-task-manager.vercel.app)

---

## What is this project?

Smile Clinique Onboarding Task Manager is a web application that streamlines the onboarding process for dental clinics. It automates task management, document handling, and communication between admins, managers, and team members, providing a single source of truth for onboarding workflows.

**Who is it for?**
- Dental clinic owners and managers
- Admin staff
- New hires and team members
- Technical/development teams

---

## Table of Contents
- [Client Overview](./CLIENT_OVERVIEW.md)
- [Features](./FEATURES.md)
- [Setup & Installation](./SETUP.md)
- [Configuration](./CONFIGURATION.md)
- [Workflows](./WORKFLOWS.md)
- [Usage Guide](./USAGE_GUIDE.md)
- [FAQ](./FAQ.md)
- [Development Guide](./DEVELOPMENT.md)
- [API Reference](./API_REFERENCE.md)
- [Security](./SECURITY.md)
- [Changelog](./CHANGELOG.md)

---

## How to use this documentation

This documentation is designed for both clients and developers. Start with the [Client Overview](./CLIENT_OVERVIEW.md) for a high-level summary, then explore [Features](./FEATURES.md) and [Workflows](./WORKFLOWS.md) for business processes. Technical users should see [Setup](./SETUP.md), [Configuration](./CONFIGURATION.md), and [API Reference](./API_REFERENCE.md). Use the navigation links above to jump to any section.

---

For the latest updates, see the [Changelog](./CHANGELOG.md).

## Project Structure

```
├── admin/                 # Admin panel related components and pages
├── components/           # Reusable UI components
├── public/              # Static assets
├── src/                 # Source code
│   ├── app/            # Next.js app directory (pages and layouts)
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utility functions and shared code
│   └── middleware.js   # Next.js middleware for authentication/routing
├── .next/              # Next.js build output
├── node_modules/       # Dependencies
└── [Configuration Files]
    ├── package.json    # Project dependencies and scripts
    ├── tailwind.config.mjs  # Tailwind CSS configuration
    ├── next.config.mjs     # Next.js configuration
    ├── jest.config.js      # Jest testing configuration
    └── .eslintrc.json     # ESLint configuration
```

## Key Directories

### `/admin`
Contains all admin-related components, pages, and functionality. This includes:
- Admin dashboard
- User management
- Task management
- System settings

### `/components`
Reusable UI components used throughout the application. These components are built using:
- React
- Tailwind CSS
- Shadcn UI components

### `/src/app`
Next.js 13+ app directory containing:
- Page routes
- Layouts
- API routes
- Server components

### `/src/hooks`
Custom React hooks for:
- State management
- Data fetching
- Authentication
- Form handling

### `/src/lib`
Utility functions and shared code:
- API clients
- Database utilities
- Authentication helpers
- Type definitions

## Technology Stack

- **Framework**: Next.js 13+
- **Language**: JavaScript/TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI
- **Testing**: Jest
- **Linting**: ESLint

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## Documentation Updates

For detailed changelog and recent updates, please refer to the [changelog directory](./changelog/README.md). 