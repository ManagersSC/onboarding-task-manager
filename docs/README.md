# Smile Clinique Onboarding Task Manager

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