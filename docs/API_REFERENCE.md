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
- **Description:** Get dashboard metrics (admin only)
- **How metrics are calculated:**
  - **Active Onboardings:**
    - Table: `Applicants`
    - View: `Active Onboardings (Current Month)` (for current month), `Active Onboardings (Last Month)` (for previous month)
    - Fields: `Stage` (must be "Hired"), `Onboarding Status` (must NOT be a completed status), `Created Time` (for month filter)
    - Value: Count of records in each view
    - Monthly Change: `(Current Month - Last Month) / Last Month * 100` (null if last month is 0)
  - **Tasks Due This Week:**
    - Table: `Tasks`
    - View: `Tasks Due This Week` (for current week), `Tasks Due Last Month` (for previous month)
    - Fields: `📆 Due Date`, `🚀 Status`
    - Value: Count of records in each view
    - Average Week Last Month: `Tasks Due Last Month / Number of weeks in last month`
    - Monthly Change: `(This Week - Average Week Last Month) / Average Week Last Month * 100` (null if denominator is 0)
- **Response:**
```
{
  activeOnboardings: number,
  activeOnboardingsLastMonth: number,
  activeOnboardingsMonthlyChange: number | null,
  tasksDueThisWeek: number,
  tasksDueLastMonth: number,
  tasksDueLastMonthAverageWeek: number,
  tasksDueThisWeekMonthlyChange: number | null
}
```

### GET `/api/admin/dashboard/resource-hub`