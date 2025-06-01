# API Reference

[← Back to Development Guide](./DEVELOPMENT.md)

## Authentication & User Endpoints

### POST `/api/login`
- **Description:** User login
- **Body:** `{ email, password }`
- **Response:** `{ message, role, name }` or error

### POST `/api/sign-up`
- **Description:** User registration
- **Body:** `{ email, password }`
- **Response:** `{ message, recordId }` or error

### POST `/api/logout`
- **Description:** Logout (clears session)
- **Response:** `{ message }` or error

### GET `/api/user`
- **Description:** Get current user profile
- **Response:** `{ email, name, job }` or error

### POST `/api/forgot-password`
- **Description:** Request password reset
- **Body:** `{ email }`
- **Response:** `{ message }` or error

### POST `/api/reset-password`
- **Description:** Reset password
- **Body:** `{ token, newPassword }`
- **Response:** `{ message }` or error

---

## Task & Dashboard Endpoints

### GET `/api/dashboard/tasks`
- **Description:** Get all tasks (grouped by status)
- **Response:** `{ tasks: { upcoming, overdue, blocked, completed } }`

### POST `/api/dashboard/tasks`
- **Description:** Create a new task
- **Body:** `{ title, description, assignTo, urgency, dueDate, createdBy }`
- **Response:** `{ task }` or error

### PATCH `/api/dashboard/tasks/[id]`
- **Description:** Update a task (e.g., mark complete)
- **Body:** `{ action: 'complete' }`
- **Response:** `{ success: true }` or error

### GET `/api/dashboard/tasks/[id]`
- **Description:** Get a single task by ID
- **Response:** `{ task }` or error

---

## Admin & Resource Endpoints

### GET `/api/admin/dashboard/quick-metrics`
- **Description:** Get dashboard metrics
- **Response:** `{ ...metrics }`

### GET `/api/admin/dashboard/resource-hub`
- **Description:** List/search onboarding resources
- **Query:** `query`, `page`, `pageSize`
- **Response:** `{ resources, totalCount, page, pageSize }`

### GET `/api/admin/activity-list`
- **Description:** List admin activity logs
- **Query:** `filter`, `eventType`, `startDate`, `endDate`, `search`, `page`, `limit`, `offset`
- **Response:** `{ activities, total, page, limit, offset }`

---

## Error Handling
- All endpoints return JSON with `error` and `details` fields on failure

---

*For more details, see the code or contact the development team.* 