# Add Applicants Webhook Integration

## Overview

This feature allows administrators to add multiple job applicants by email addresses through a webhook integration with Make.com (formerly Integromat). The system sends applicant data to an external automation service and provides real-time feedback to users.

## Features

- **Job Type Selection**: Choose from predefined job types (Nurse, Receptionist, Dentist, Manager)
- **Bulk Email Input**: Add multiple applicants by entering email addresses separated by commas, spaces, or new lines
- **Real-time Validation**: Email format validation with immediate feedback
- **Webhook Integration**: Sends data to Make.com webhook for automated processing
- **User Feedback**: Toast notifications for all success/error states
- **Processing Status**: Only shows success when automation actually completes
- **Authentication**: Admin-only access with proper session validation

## Components

### 1. Add Applicant Dialog (`components/admin/users/add-applicant-dialog.js`)

**Features:**
- Job type dropdown selection
- Multi-email input with validation
- Real-time email parsing and counting
- Form validation before submission
- Success/error toast notifications

**UI Elements:**
- Job Type Selector (required)
- Email Addresses Textarea (required)
- Validation feedback
- Submit button with loading state

### 2. Server Actions (`src/app/admin/users/actions.js`)

**Function:** `addApplicantsByEmail(emails, jobType)`

**Features:**
- Calls webhook directly with proper security
- Waits for automation to actually complete processing
- Only shows success when automation reports completion
- Maintains backward compatibility with mock data
- Error handling and user feedback
- Updates mock data with selected job type

## Webhook Integration

### Webhook URL
The system sends data to the webhook URL specified in the environment variable:
```
MAKE_WEBHOOK_URL_NEW_APPLICATION_FORM
```

### Webhook Payload
```json
{
  "emails": ["john@example.com", "jane@example.com"],
  "jobType": "Nurse",
  "timestamp": "2024-12-19T10:30:00.000Z",
  "source": "Admin Panel",
  "requestId": "req_1234567890_abc123"
}
```

### Expected Response
The webhook should return:
- **200**: Request accepted, but check the response body for actual processing status
- **4xx/5xx**: Error - Something went wrong, no invites sent

**Important**: Only HTTP 200 status codes will be accepted, but the success message is only shown when the automation actually completes processing.

### Webhook Response Format
Your Make.com automation should return a JSON response with a `status` field:

```json
{
  "status": "completed",
  "message": "Application invites sent successfully",
  "processedEmails": ["john@example.com", "jane@example.com"],
  "timestamp": "2024-12-19T10:30:00.000Z"
}
```

**Status Values:**
- `"completed"` or `"success"`: ✅ Shows success message
- `"processing"` or `"pending"`: ⏳ Shows "being processed" message
- `"failed"` or `"error"`: ❌ Shows error message
- Any other status: ⚠️ Shows "status unclear" message

**Example Responses:**

**Success (Completed):**
```json
{
  "status": "completed",
  "message": "All application invites sent successfully"
}
```

**Processing (Still Working):**
```json
{
  "status": "processing",
  "message": "Application invites are being processed"
}
```

**Failed:**
```json
{
  "status": "failed",
  "message": "Failed to send invites due to email service error"
}
```

## Environment Variables

Add this to your `.env.local` file:
```bash
# Make.com webhook URL for new application forms
MAKE_WEBHOOK_URL_NEW_APPLICATION_FORM=https://hook.eu1.make.com/your-webhook-url-here
```

## Usage Flow

1. **Admin Access**: User must be logged in as admin
2. **Open Dialog**: Click "Add Applicant" button on users page
3. **Select Job Type**: Choose from dropdown (Nurse, Receptionist, Dentist, Manager)
4. **Enter Emails**: Paste or type email addresses
5. **Validation**: System validates email format and job type
6. **Submit**: Click "Add Applicants" button
7. **Processing**: System calls webhook and waits for completion
8. **Feedback**: Success/error toast notification based on automation status
9. **Refresh**: Users table refreshes to show new data

## Error Handling

### Validation Errors
- Empty email list
- Invalid email format
- Missing job type
- Unauthorized access

### Webhook Errors
- Network failures
- Invalid webhook URL
- Webhook service errors
- Timeout issues
- **Any non-200 HTTP status code**

### Automation Status Errors
- **Processing**: "Application invites are being processed. Please check back later for confirmation."
- **Failed**: "Automation failed: [specific error message]"
- **Status Unclear**: "Application invites submitted but processing status unclear. Please check back later."

### User Feedback
- **Success**: "Successfully sent application invite to X person/people" (only when automation reports completion)
- **Processing**: "Application invites are being processed. Please check back later for confirmation."
- **Error**: Toast notifications for all error states
- Detailed error messages in development
- Generic error messages in production

## Security Features

- **Authentication**: Session-based admin authentication
- **Authorization**: Admin role verification
- **Input Validation**: Email format and job type validation
- **Rate Limiting**: Built into the middleware
- **Logging**: Comprehensive error and success logging
- **Environment Protection**: Webhook URL stored securely in environment variables

## Testing

### Manual Testing
1. Test with valid email addresses
2. Test with invalid email formats
3. Test without selecting job type
4. Test with empty email list
5. Test webhook failure scenarios
6. Test webhook returning different status values

### Webhook Response Testing
- **200 + status: "completed"**: Should show success message
- **200 + status: "processing"**: Should show "being processed" message
- **200 + status: "failed"**: Should show error message
- **200 + status: "unknown"**: Should show "status unclear" message
- **4xx, 5xx**: Should show error message
- **Network errors**: Should show error message

## Make.com Automation Setup

Your Make.com automation should:

1. **Receive the webhook** with applicant data
2. **Process the data** (send emails, create records, etc.)
3. **Return appropriate status** in the response:
   - `"processing"` if still working
   - `"completed"` when finished successfully
   - `"failed"` if something went wrong

**Example Make.com Response:**
```json
{
  "status": "completed",
  "message": "Successfully sent application invites to 2 applicants",
  "processedCount": 2,
  "timestamp": "2024-12-19T10:30:00.000Z"
}
```

## Future Enhancements

1. **Real Database Integration**: Replace mock data with Airtable integration
2. **Email Templates**: Customizable email templates for different job types
3. **Bulk Import**: CSV file upload for large applicant lists
4. **Status Tracking**: Real-time webhook processing status
5. **Retry Logic**: Automatic retry for failed webhook calls
6. **Webhook History**: Log and display webhook call history
7. **Progress Updates**: Real-time updates during automation processing

## Troubleshooting

### Common Issues

1. **Webhook URL Not Configured**
   - Check `MAKE_WEBHOOK_URL_NEW_APPLICATION_FORM` environment variable
   - Ensure webhook URL is accessible

2. **Authentication Errors**
   - Verify admin session is valid
   - Check session cookie expiration

3. **Validation Errors**
   - Ensure email format is correct
   - Verify job type is selected from dropdown

4. **Webhook Failures**
   - Check webhook service status
   - Verify webhook URL is correct
   - Check network connectivity
   - **Ensure webhook returns HTTP 200 and proper status field**

5. **Automation Not Completing**
   - Check Make.com automation logs
   - Verify automation returns proper status values
   - Ensure automation doesn't hang or fail silently

### Debug Mode
Set `NODE_ENV=development` to see detailed error messages in API responses.

## Dependencies

- **Frontend**: React, Sonner (toast notifications), UI components
- **Backend**: Next.js server actions, Iron-session authentication
- **External**: Make.com webhook integration
- **Logging**: Console logging for debugging

## Files Modified

- `components/admin/users/add-applicant-dialog.js` - Updated UI with job type selection and success message
- `src/app/admin/users/actions.js` - Updated to wait for automation completion
- `docs/add-applicants-webhook-integration.md` - This documentation

## Date

December 19, 2024
