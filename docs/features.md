# Smile Clinique Onboarding Task Manager - Features & Architecture Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [User Roles & Authentication](#user-roles--authentication)
3. [Core Features](#core-features)
4. [Page Structure](#page-structure)
5. [Component Architecture](#component-architecture)
6. [Technical Implementation](#technical-implementation)

## System Overview

The Smile Clinique Onboarding Task Manager is a comprehensive web application designed to streamline the onboarding process for dental clinics. Built with Next.js 13+ and modern web technologies, it provides a robust platform for managing tasks, users, and clinic onboarding workflows.

### Key Objectives
- Streamline clinic onboarding process
- Manage and track onboarding tasks
- Provide role-based access control
- Enable efficient communication between stakeholders
- Maintain comprehensive audit trails

## User Roles & Authentication

### Authentication System
- Secure login system with email/password
- Password reset functionality
- Session management
- Protected routes and API endpoints

### User Roles
1. **Admin**
   - Full system access
   - User management
   - Task template creation
   - System configuration

2. **Clinic Manager**
   - Clinic-specific task management
   - Team member management
   - Progress tracking
   - Report generation

3. **Team Members**
   - Task execution
   - Progress updates
   - Document submission
   - Communication

## Core Features

### 1. Task Management
- **What:** Create, assign, track, and complete onboarding tasks
- **Who:** Admins, Managers, Team Members
- **Example:** Admin assigns a checklist to a new hire; team member marks tasks as complete; manager reviews progress

### 2. Dashboard & Analytics
- **What:** Visual overview of onboarding status, completion rates, overdue tasks, and team performance
- **Who:** Admins, Managers
- **Example:** Manager views dashboard to see which hires are behind schedule

### 3. Document Management
- **What:** Upload, categorize, and review onboarding documents
- **Who:** Team Members (upload), Admins/Managers (review)
- **Example:** New hire uploads ID; admin verifies and marks as received

### 4. Calendar & Scheduling
- **What:** Schedule onboarding events, meetings, and deadlines (Google Calendar integration)
- **Who:** Admins, Managers
- **Example:** Manager schedules orientation session; team receives calendar invite

### 5. Communication & Notifications
- **What:** Internal messaging, task comments, and real-time notifications (toast system)
- **Who:** All users
- **Example:** Team member comments on a task; admin receives notification

### 6. Audit Logging & Compliance
- **What:** All key actions are logged for compliance and troubleshooting
- **Who:** Admins (view logs)
- **Example:** Admin reviews audit log to see who completed a task

### 7. Role-Based Access Control
- **What:** Different permissions for Admin, Manager, Team Member
- **Who:** All users
- **Example:** Only admins can create templates; team members can only see their own tasks

## Page Structure

### 1. Authentication Pages
- `/login` - User authentication
- `/forgot-password` - Password recovery
- `/reset-password` - Password reset

### 2. Dashboard Pages
- `/dashboard` - Main dashboard
- `/dashboard/tasks` - Task management
- `/dashboard/analytics` - Performance analytics
- `/dashboard/settings` - User settings

### 3. Admin Pages
- `/admin` - Admin dashboard
- `/admin/users` - User management
- `/admin/tasks` - Task template management
- `/admin/settings` - System configuration

## Component Architecture

### 1. Core Components
- `TaskCard.js` - Individual task display
- `TaskList.js` - Task collection display
- `FolderCard.js` - Document folder management
- `DashboardNav.js` - Navigation system
- `ProfileActions.js` - User profile management

### 2. UI Components
- Theme system (light/dark mode)
- Loading animations
- Form components
- Modal dialogs
- Notification system

### 3. Layout Components
- Main layout wrapper
- Navigation sidebar
- Header component
- Footer component

## Technical Implementation

### Frontend Architecture
- **Framework**: Next.js 13+
- **State Management**: React Hooks
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI
- **Theme System**: Custom theme provider

### Backend Architecture
- **API Routes**: Next.js API routes
- **Authentication**: Custom middleware
- **Database**: (To be specified)
- **File Storage**: (To be specified)

### Security Features
- Protected API routes
- Role-based access control
- Secure file handling
- Input validation
- XSS protection

### Performance Optimizations
- Server-side rendering
- Image optimization
- Code splitting
- Caching strategies
- Lazy loading

## Development Guidelines

### Code Organization
- Feature-based directory structure
- Component isolation
- Reusable hooks
- Utility functions
- Type definitions

### Best Practices
- Component documentation
- Type safety
- Error handling
- Loading states
- Responsive design

### Testing Strategy
- Unit tests
- Integration tests
- End-to-end tests
- Performance testing
- Security testing

## Deployment & Maintenance

### Deployment Process
1. Build optimization
2. Environment configuration
3. Database migration
4. File system setup
5. SSL configuration

### Monitoring
- Error tracking
- Performance monitoring
- User analytics
- System health checks
- Backup procedures

## Task Management: Refresh Button

**Feature Added:** Refresh Button in Task Management UI

- **Location:** In the Task Management component header, to the left of the "New Task" button.
- **Icon:** Uses the `RefreshCw` icon from lucide-react.
- **Purpose:** Allows users to manually refresh and refetch the latest tasks from the backend without reloading the page.
- **Usage:**
  - Click the "Refresh" button to reload the task list.
  - The button is styled as an outlined button for clear distinction.

**Developer Note:**
- The button calls the `fetchTasks` function, which re-fetches tasks from `/api/dashboard/tasks` and updates the UI accordingly.
- This improves user experience by providing a quick way to sync the task list with backend changes.

---

This documentation is a living document and will be updated as new features are added or existing ones are modified. For the latest changes, please refer to the [changelog](./changelog/README.md).

## Example Workflows
- [See Workflows](./WORKFLOWS.md)

## Screenshots
*Screenshots here as the project evolves.*

---

[Setup & Installation →](./SETUP.md)

## Notification System & Task Completion Logic

### Overview
The notification system ensures users are promptly informed about important events in the onboarding workflow, such as task assignments, completions, updates, deletions, and document uploads. Notifications are delivered in-app and, based on user preferences, via Email and Slack (integrated through Make.com).

### Notification Types
- **Task Assignment:** When a user is assigned a new task.
- **Task Completion:** When a task is completed.
- **Task Update:** When a task is edited/updated.
- **Task Deletion:** When a task is deleted.
- **Document Upload:** When new documents are uploaded to a task.

### Delivery Channels
- **In-App:** All notifications are stored in the Airtable `Notifications` table and shown in the app UI.
- **Email & Slack:** If enabled in the user's notification preferences, notifications are also sent to Make.com, which relays them to Email and/or Slack.

### User Preferences
- Each staff user can configure which notification types and channels they wish to receive (see the `Notification Preferences` and `Notification Channels` fields in the Staff table).
- The backend respects these preferences and only delivers notifications accordingly.

### Task Completion Notification Logic

When a task is marked as complete, the following business rules apply:

- **Task Creator:** Always notified when their task is completed (unless they are the one completing it).
- **Assigned Staff:** Notified if someone else completes their assigned task.
- **No duplicate notifications** are sent to the same person for a single event.

#### Notification Flow Table
| Recipient      | When Notified                                      | Message Example                                      |
|---------------|----------------------------------------------------|------------------------------------------------------|
| Task Creator   | When their assigned task is completed by someone else | "Your task 'X' assigned to staff has been completed by [User]" |
| Assigned Staff | If someone else completes their task               | "Task 'X' was marked complete by [User]"             |

#### Example JSON Payload to Make.com
```json
{
  "title": "Task Completed",
  "body": "Your task 'X' assigned to staff has been completed by John Doe.",
  "type": "Task Completion",
  "severity": "Success",
  "actionUrl": "",
  "source": "System",
  "recipientId": "recXXXXXXXX",
  "channels": ["Email", "Slack"]
}
```

### Backend Implementation
- **API Endpoint:** `PATCH /api/dashboard/tasks/[id]` with `{ action: "complete" }` triggers the notification logic.
- **Logic Location:** See [`src/app/api/dashboard/tasks/[id]/route.js`](../src/app/api/dashboard/tasks/[id]/route.js).
- **Notification Utility:** See [`src/lib/notifications.js`](../src/lib/notifications.js) for delivery and preference handling.
- **Airtable Integration:** All notification records are stored in the `Notifications` table, and user preferences are read from the `Staff` table.

### Extensibility & Best Practices
- The notification system is designed to be extensible for new event types and delivery channels.
- All notification types should be added to both the `Notifications` table and the `Notification Preferences` field in the `Staff` table for consistency.
- The system respects user preferences and avoids notification spam by preventing duplicate notifications for the same event.

--- 