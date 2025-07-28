# New Hire Tracker API Documentation

## Overview
The New Hire Tracker API provides endpoints for managing onboarding start dates and fetching new hire progress data. This system integrates with Airtable for data storage and make.com for task automation.

## API Endpoints

### GET `/api/admin/dashboard/new-hires`

**Purpose:** Fetch all hired applicants with onboarding data for the NewHireTracker component.

**Authentication:** Admin only

**Response:**
```json
{
  "newHires": [
    {
      "id": "recXXXXXXXXXXXXXX",
      "name": "Sarah Chen",
      "email": "sarah.chen@example.com",
      "role": "Senior Developer",
      "department": "Engineering",
      "onboardingStartDate": "2024-06-15",
      "onboardingStarted": true,
      "onboardingInitiationFlow": true,
      "onboardingStatus": "Week 1 Quiz ✅",
      "onboardingWeek": 2,
      "onboardingWeekDay": 3,
      "progress": 75,
      "tasks": {
        "completed": 9,
        "total": 12
      },
      "avatar": "/file.svg"
    }
  ]
}
```

**Data Source:**
- **Table:** `Applicants`
- **Filter:** `Stage = "Hired"` AND `Onboarding Status != "Week 4 Quiz ✅"`
- **Progress Calculation:** Based on completed tasks in `Onboarding Tasks Logs` table

---

### POST `/api/admin/dashboard/new-hires/[id]/start-onboarding`

**Purpose:** Set onboarding start date and trigger automation.

**Authentication:** Admin only

**Request Body:**
```json
{
  "onboardingStartDate": "2024-06-15",
  "triggerAutomation": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Onboarding started successfully",
  "record": {
    "id": "recXXXXXXXXXXXXXX",
    "onboardingStartDate": "2024-06-15",
    "onboardingStarted": true,
    "onboardingInitiationFlow": true
  }
}
```

**Airtable Updates:**
- `Onboarding Start Date` - Set to provided date
- `Onboarding Started` - Set to `true`
- `Onboarding Initiation Flow` - Set to `true`

**Webhook Integration:**
Sends payload to make.com webhook:
```json
{
  "action": "initiate",
  "id": "recXXXXXXXXXXXXXX",
  "name": "Sarah Chen",
  "email": "sarah.chen@example.com",
  "week": 2,
  "day": 3
}
```

---

## Airtable Field Mapping

| Frontend Field | Airtable Field | Field ID | Description |
|----------------|----------------|----------|-------------|
| name | Name | fldAQU0XOrRuerhPm | Applicant name |
| email | Email | fldjmvdigpKYyZS63 | Applicant email |
| role | Job Name | fldd0RHjePJFSOoQP | Job title (lookup) |
| department | Applying For | fld2kd9SxfdltFVwW | Department (lookup) |
| onboardingStartDate | Onboarding Start Date | fldd7rTmfmYj3cOPx | Start date |
| onboardingStarted | Onboarding Started | fldsIWiIlvbYR6387 | Checkbox |
| onboardingInitiationFlow | Onboarding Initiation Flow | fld2nyN42AUWMzDfO | Checkbox |
| onboardingStatus | Onboarding Status | fld1mX6xmjVdFsIPE | Single select |
| onboardingWeek | Onboarding Week | fldU1NCLASP3JOVEt | Formula field |
| onboardingWeekDay | Onboarding Week Day | fldaG3eEaTW3NBczw | Formula field |

---

## Environment Variables

Add to your `.env` file:
```bash
MAKE_WEBHOOK_URL_ONBOARDING=https://your-make-webhook-url.com/onboarding
```

---

## Error Handling

### Common Error Responses

**401 Unauthorized:**
```json
{
  "error": "Unauthorised"
}
```

**400 Bad Request:**
```json
{
  "error": "Onboarding start date cannot be in the past"
}
```

**404 Not Found:**
```json
{
  "error": "Applicant not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error"
}
```

---

## Audit Logging

All operations are logged to the "Website Audit Log" table with:
- **Event Type:** "New Hires Data Fetch" / "Onboarding Start Date Set"
- **Event Status:** "Success" / "Error"
- **User Details:** Role, name, email
- **Detailed Message:** Operation description

---

## Frontend Integration

### Component Usage

```javascript
// Fetch new hires data
const response = await fetch('/api/admin/dashboard/new-hires')
const data = await response.json()
const newHires = data.newHires

// Set onboarding start date
const response = await fetch(`/api/admin/dashboard/new-hires/${applicantId}/start-onboarding`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    onboardingStartDate: "2024-06-15",
    triggerAutomation: true
  })
})
```

### State Management

The NewHireTracker component manages:
- `newHires` - Array of hire data
- `loading` - Loading state
- `startDateModalOpen` - Modal visibility
- `settingStartDate` - Start date setting state

---

## Validation Rules

### Date Validation
- Start date cannot be in the past
- Date format: YYYY-MM-DD
- Minimum date: Today

### Permission Validation
- Only admin users can access endpoints
- Session must be valid and active

---

## Integration with Existing System

### Current Automation Flow
1. Admin sets start date via API
2. API updates Airtable fields
3. Webhook sent to make.com
4. make.com handles task assignment
5. Real-time updates in dashboard

### Backward Compatibility
- Existing Airtable automation still works
- New API endpoints complement existing system
- No breaking changes to current workflow

---

## Troubleshooting

### Common Issues

**1. "Applicant not found" error**
- Check that the applicant ID is correct
- Verify the applicant exists in Airtable
- Ensure the applicant has Stage = "Hired"

**2. Webhook failures**
- Check `MAKE_WEBHOOK_URL_ONBOARDING` environment variable
- Verify webhook URL is accessible
- Check make.com webhook configuration

**3. Progress calculation issues**
- Verify Onboarding Tasks Logs table structure
- Check Assigned field linking to Applicants
- Ensure Status field has correct values

**4. Permission errors**
- Verify user has admin role
- Check session validity
- Ensure proper authentication

### Debug Information

Enable debug logging by setting:
```bash
NODE_ENV=development
```

Check server logs for:
- Airtable API responses
- Webhook payload details
- Error stack traces

---

## Security Considerations

1. **Authentication:** All endpoints require valid admin session
2. **Authorization:** Only admin users can access endpoints
3. **Input Validation:** Date validation prevents invalid inputs
4. **Audit Trail:** All operations are logged for security
5. **Error Handling:** Sensitive information not exposed in errors

---

## Performance Considerations

1. **Caching:** Consider implementing caching for frequently accessed data
2. **Pagination:** Large datasets may need pagination
3. **Batch Operations:** Multiple updates could be batched
4. **Webhook Timeouts:** Webhook calls have timeout limits

---

## Future Enhancements

1. **Bulk Operations:** Set start dates for multiple hires
2. **Advanced Filtering:** Filter by department, role, status
3. **Progress Analytics:** Detailed progress tracking
4. **Notification System:** Email/Slack notifications for status changes
5. **Timeline View:** Visual onboarding timeline 