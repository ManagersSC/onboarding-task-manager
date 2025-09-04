# Bulk Delete Tasks Feature

## Overview

The bulk delete tasks feature allows administrators to select multiple tasks from the resources page and delete them in a single operation. This feature includes a confirmation modal to prevent accidental deletions and provides detailed feedback about the operation results.

## Features

### Selection Interface
- **Individual Selection**: Users can select individual tasks using checkboxes in the table
- **Select All**: A master checkbox in the table header allows selecting/deselecting all visible tasks
- **Visual Feedback**: Selected tasks are clearly indicated with checked checkboxes

### Bulk Delete Button
- **Conditional Display**: The "Delete" button only appears when one or more tasks are selected
- **Dynamic Count**: The button shows the number of selected tasks (e.g., "Delete (3)")
- **Positioning**: Located inline with the "Showing X tasks" text, to the right of the search box

### Confirmation Modal
- **Detailed Information**: Shows the titles of selected tasks (up to 10, with "and X more" for additional)
- **Comma + New Line Format**: Task titles are separated by comma and new line for better readability
- **Clear Warning**: Prominent warning about the irreversible nature of the action
- **Loading State**: Shows loading spinner and disables buttons during deletion
- **Error Handling**: Displays appropriate error messages if deletion fails

### API Integration
- **Bulk Operation**: Single API call handles deletion of multiple tasks
- **Partial Success Handling**: Reports both successful and failed deletions
- **Audit Logging**: All bulk delete operations are logged for audit purposes
- **Error Recovery**: Continues processing even if some deletions fail

## Technical Implementation

### Components

#### `BulkDeleteTasksModal` (`components/tasks/BulkDeleteTasksModal.jsx`)
- Modal dialog for confirming bulk delete operations
- Handles the actual API call to delete tasks
- Provides user feedback through toast notifications
- Manages loading states during the operation
- Formats task titles with comma and new line separation

#### Updated `TasksTable` (`components/tasks/TasksTable.js`)
- Enhanced selection state management
- Exposes selection changes to parent component
- Maintains existing functionality while adding bulk operations support
- Includes checkbox column and delete button

#### Updated `ResourcePage` (`components/tasks/ResourcePage.js`)
- Manages selected tasks state
- Coordinates between table selection and delete modal

### API Endpoint

#### `DELETE /api/admin/tasks/bulk-delete`
- **Authentication**: Requires admin session
- **Input**: JSON body with `taskIds` array and optional `testMode` flag
- **Output**: Success/failure status with detailed counts
- **Error Handling**: Comprehensive error reporting and logging

```javascript
// Request
{
  "taskIds": ["rec123", "rec456", "rec789"],
  "testMode": true  // Optional, defaults to false
}

// Response
{
  "success": true,
  "message": "TEST MODE: Would delete 3 tasks",
  "deletedIds": ["rec123", "rec456", "rec789"],
  "failedIds": [],
  "deletedCount": 3,
  "failedCount": 0,
  "testMode": true
}
```

## User Experience

### Workflow
1. **Select Tasks**: User checks boxes next to tasks they want to delete
2. **Delete Button Appears**: "Delete (X)" button appears inline with task count
3. **Click Delete**: User clicks the delete button
4. **Confirmation Modal**: Modal opens showing selected tasks and warning
5. **Confirm Deletion**: User confirms the deletion
6. **Processing**: System shows loading state while processing
7. **Feedback**: Toast notification shows results
8. **Refresh**: Table refreshes to show updated data

### Safety Features
- **Confirmation Required**: No accidental deletions without explicit confirmation
- **Clear Warnings**: Prominent warnings about data loss
- **Detailed Preview**: Shows exactly which tasks will be deleted
- **Audit Trail**: All operations are logged for compliance

## Error Handling

### API Errors
- **Authentication Failures**: Proper 401 responses for unauthorized access
- **Validation Errors**: 400 responses for invalid input
- **Server Errors**: 500 responses with appropriate error messages

### Partial Failures
- **Mixed Results**: Handles cases where some deletions succeed and others fail
- **User Feedback**: Clear messaging about partial success scenarios
- **Retry Guidance**: Appropriate guidance for handling failed deletions

### Network Issues
- **Timeout Handling**: Graceful handling of network timeouts
- **Retry Logic**: Built-in retry mechanisms for transient failures
- **User Notification**: Clear error messages for network issues

## Security Considerations

### Access Control
- **Admin Only**: Feature restricted to admin users
- **Session Validation**: Proper session validation for all operations
- **Audit Logging**: All operations logged with user identification

### Data Protection
- **Confirmation Required**: Prevents accidental data loss
- **Detailed Logging**: Comprehensive audit trail for compliance
- **Error Handling**: Secure error messages that don't leak sensitive information

## Testing

### Test Mode
The API includes a `testMode` parameter that simulates deletions without actually removing data from Airtable.

```javascript
// Safe test request
{
  "taskIds": ["rec123", "rec456"],
  "testMode": true
}
```

### Test Endpoints
- **Main API**: `/api/admin/tasks/bulk-delete` with `testMode: true`
- **Test Endpoint**: `/api/admin/tasks/bulk-delete/test` for connection testing
- **Test Script**: `scripts/test-bulk-delete-tasks.js` for automated testing

### Testing Methods

#### Method 1: Browser Developer Tools
```javascript
// Test with fake IDs (safe)
fetch('/api/admin/tasks/bulk-delete', {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    taskIds: ['rec_fake_001', 'rec_fake_002'],
    testMode: true
  })
})
.then(response => response.json())
.then(data => console.log('Test result:', data))
```

#### Method 2: Test Script
```bash
node scripts/test-bulk-delete-tasks.js
```

#### Method 3: Frontend UI Testing
- Select tasks in the table
- Click the delete button
- Confirm in the modal
- Verify the test mode response

## Test Scenarios

### Scenario 1: Valid Test Data
```javascript
{
  "taskIds": ["rec_test_001", "rec_test_002"],
  "testMode": true
}
```
**Expected Result**: Success with test mode message

### Scenario 2: Invalid IDs
```javascript
{
  "taskIds": ["rec_nonexistent_001"],
  "testMode": true
}
```
**Expected Result**: Success (test mode doesn't validate existence)

### Scenario 3: Empty Array
```javascript
{
  "taskIds": [],
  "testMode": true
}
```
**Expected Result**: 400 error - "Invalid request: taskIds is required"

### Scenario 4: Malformed Request
```javascript
{
  "testMode": true
  // Missing taskIds
}
```
**Expected Result**: 400 error - "Invalid request: taskIds is required"

### Scenario 5: Unauthorized Access
```javascript
// Request without valid session cookie
{
  "taskIds": ["rec_test_001"],
  "testMode": true
}
```
**Expected Result**: 401 error - "Unauthorised"

## Production Testing

### Before Going Live

1. **Test with Real Data (Test Mode)**
   ```javascript
   // Use actual task IDs from your Airtable
   const realTaskIds = ['rec_actual_id_1', 'rec_actual_id_2']
   
   fetch('/api/admin/tasks/bulk-delete', {
     method: 'DELETE',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       taskIds: realTaskIds,
       testMode: true
     })
   })
   ```

2. **Verify Test Results**
   - Check that all IDs are processed
   - Verify no actual deletions occurred
   - Confirm no automations were triggered

3. **Test Error Handling**
   - Try with non-existent IDs
   - Test with invalid session
   - Verify proper error messages

### Going Live

1. **Remove Test Mode**
   - Change `testMode: true` to `testMode: false` in the modal
   - Test with a small batch first
   - Monitor logs and automations

2. **Monitor Results**
   - Check audit logs
   - Verify no unwanted automations
   - Confirm data integrity

## Troubleshooting

### Common Issues

1. **"Unauthorised" Error**
   - Ensure you're logged in as admin
   - Check session cookie is valid
   - Verify user role is 'admin'

2. **"Invalid request" Error**
   - Check taskIds is an array
   - Ensure array is not empty
   - Verify JSON format is correct

3. **Network Errors**
   - Check API endpoint URL
   - Verify server is running
   - Check network connectivity

### Debug Information

1. **Check Server Logs**
   ```bash
   # Look for test mode logs
   grep "TEST MODE" logs/app.log
   ```

2. **Browser Network Tab**
   - Check request/response details
   - Verify headers and body
   - Look for error responses

3. **Console Errors**
   - Check for JavaScript errors
   - Verify API responses
   - Look for network failures

## Best Practices

### Testing
- Always use `testMode: true` for initial testing
- Test with small batches first
- Verify results before production use
- Keep test logs for reference

### Production
- Start with small batches
- Monitor audit logs
- Have rollback plan ready
- Test automations separately

### Security
- Never test with production data without test mode
- Use proper authentication
- Monitor for unauthorized access
- Keep audit trails

## Environment Variables

Ensure these are set for testing:
```bash
AIRTABLE_API_KEY=your_api_key
AIRTABLE_BASE_ID=your_base_id
SESSION_SECRET=your_session_secret
NODE_ENV=development  # For detailed error messages
```

## Dependencies

### Frontend
- React hooks for state management
- Sonner for toast notifications
- Lucide React for icons
- Shadcn/ui components for UI elements

### Backend
- Airtable API for data operations
- Iron Session for authentication
- Custom audit logging system

## Configuration

### Environment Variables
- `AIRTABLE_API_KEY`: Required for Airtable operations
- `AIRTABLE_BASE_ID`: Required for Airtable base identification
- `SESSION_SECRET`: Required for session validation

### Feature Flags
- `testMode`: Set to `true` for safe testing, `false` for production

## Monitoring

### Metrics
- Bulk delete operation frequency
- Success/failure rates
- Average operation size
- User engagement with the feature

### Alerts
- High failure rates for bulk operations
- Unusual patterns in bulk delete usage
- Authentication failures for bulk operations

## Support

If you encounter issues:
1. Check the troubleshooting section
2. Review server logs
3. Test with the provided scripts
4. Verify environment configuration
