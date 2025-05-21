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
- **Task Creation & Assignment**
  - Create custom tasks
  - Assign to team members
  - Set deadlines and priorities
  - Add attachments and comments

- **Task Tracking**
  - Real-time status updates
  - Progress monitoring
  - Deadline notifications
  - Completion verification

- **Task Deletion with Undo**
  - When a user deletes a task, it is immediately removed from the UI and a notification (toast) appears with an Undo option.
  - The actual delete request to the backend is delayed until the notification disappears (after a set duration, e.g., 10 seconds).
  - If the user clicks Undo, the task is restored in the UI and no delete request is sent.
  - If the notification is dismissed or times out, the task is permanently deleted from the backend.
  - This pattern prevents accidental data loss and provides a user-friendly experience.

### 2. Dashboard System
- **Overview Dashboard**
  - Task completion statistics
  - Recent activities
  - Pending items
  - Performance metrics

- **Analytics Dashboard**
  - Task completion rates
  - Time tracking
  - Team performance
  - Custom reports

### 3. Document Management
- **File Handling**
  - Secure file uploads
  - Document versioning
  - Access control
  - File categorization

### 4. Communication System
- **Internal Messaging**
  - Task-specific comments
  - Team notifications
  - Status updates
  - Mention system

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