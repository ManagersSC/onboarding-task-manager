# Bulk Create Resources Feature

## Overview

The Bulk Create Resources feature allows administrators to create multiple onboarding resources at once through an intuitive interface. This feature is designed for efficiency when setting up onboarding programs with many resources.

## Features

- **Bulk Resource Creation**: Create multiple resources in a single operation
- **Dynamic Form Interface**: Add/remove resource rows as needed
- **Smart Auto-increment**: Automatically increment week/day numbers
- **Copy Previous Values**: Copy values from the previous row for efficiency
- **Real-time Validation**: Validate each resource as you type
- **Preview Mode**: Show a summary of all resources before creation
- **Test Mode**: Safe testing without affecting the database
- **Comprehensive Error Handling**: Clear error messages and validation

## User Interface

### Accessing the Feature

1. Navigate to **Admin > Resources** (`/admin/resources`)
2. Click the **"Create Resource"** dropdown button
3. Select **"Bulk Resources"**

### Interface Components

#### Action Buttons
- **Add Row**: Add a single resource row
- **Add 5 Rows**: Add 5 resource rows at once
- **Clear All**: Remove all resource rows
- **Show Summary**: Toggle preview of all resources

#### Resource Form Fields
- **Task Name**: Name of the resource (required)
- **Description**: Detailed description of the resource (optional)
- **Week**: Week number (0-5, required)
- **Day**: Day number (0-5, required)
- **Medium Type**: Type of resource (Doc, Video, G.Drive, Quiz, etc.)
- **Resource Link**: URL to the resource (optional)

#### Smart Features
- **Auto-increment**: Week and day numbers automatically increment
- **Copy Previous**: Copy values from the previous row
- **Individual Delete**: Remove specific resource rows
- **Bulk Actions**: Add multiple rows or clear all at once

## API Reference

### Endpoint
```
POST /api/admin/tasks/bulk-create
```

### Authentication
- Requires valid admin session
- Session cookie must be present
- User must have admin role

### Request Body
```json
{
  "resources": [
    {
      "taskName": "string (required)",
      "taskDescription": "string (optional)",
      "taskWeek": "number (required, 0-5)",
      "taskDay": "number (required, 0-5)",
      "taskMedium": "string (required)",
      "taskLink": "string (optional, valid URL)"
    }
  ],
  "testMode": "boolean (default: false)"
}
```

### Field Validation

#### Required Fields
- `taskName`: Must not be empty
- `taskWeek`: Must be between 0 and 5
- `taskDay`: Must be between 0 and 5
- `taskMedium`: Must be one of: Doc, Video, G.Drive, Quiz, Custom, Managers

#### Optional Fields
- `taskDescription`: Can be empty
- `taskLink`: Must be valid URL if provided

### Response Format
```json
{
  "success": true,
  "message": "X resources created successfully",
  "createdIds": ["rec123", "rec456"],
  "failedResources": [],
  "testMode": false
}
```

### Error Responses

#### Validation Error (400)
```json
{
  "error": "Invalid resource at index 0: taskName, taskWeek, taskDay, and taskMedium are required"
}
```

#### Authentication Error (401)
```json
{
  "error": "Unauthorised"
}
```

#### Server Error (500)
```json
{
  "error": "Internal server error",
  "details": "Error message in development mode"
}
```

## Database Schema

### Target Table: Onboarding Tasks
- **Table ID**: `tblPakqoPLP632suo`
- **Table Name**: "Onboarding Tasks"

### Field Mapping
| Form Field | Airtable Field | Type | Required |
|------------|----------------|------|----------|
| taskName | Task | singleLineText | ✅ |
| taskDescription | Task Body | multilineText | ❌ |
| taskWeek | Week Number | singleSelect | ✅ |
| taskDay | Day Number | singleSelect | ✅ |
| taskMedium | Type | singleSelect | ✅ |
| taskLink | Link | url | ❌ |

### Additional Fields (Auto-populated)
- **Created By**: Current user name
- **Created Date**: Current timestamp

## Testing

### Test Mode
The API supports a `testMode` parameter that simulates resource creation without actually creating records in Airtable.

```json
{
  "resources": [...],
  "testMode": true
}
```

### Test Endpoint
```
POST /api/admin/tasks/bulk-create/test
```

This endpoint validates the API connection and field structure without creating any records.

### Test Script
A comprehensive test script is available at `scripts/test-bulk-create-tasks.js`:

```bash
# Set environment variables
export NEXT_PUBLIC_API_URL="http://localhost:3000"
export TEST_SESSION_COOKIE="your_session_cookie_here"

# Run tests
node scripts/test-bulk-create-tasks.js
```

## Security Features

### Authentication
- Session-based authentication using iron-session
- 8-hour session TTL
- Secure session cookie handling

### Authorization
- Admin role required
- Role validation on every request
- Unauthorized access properly rejected

### Input Validation
- Comprehensive field validation
- URL format validation
- Range validation for numeric fields
- XSS protection through proper sanitization

### Audit Logging
- All successful operations logged
- User information tracked
- Resource details recorded
- Test mode operations excluded from audit logs

## Error Handling

### Validation Errors
- Field-level validation with specific error messages
- Index-based error reporting for bulk operations
- Clear indication of which fields are invalid

### Network Errors
- Proper error handling for Airtable API failures
- Graceful degradation for partial failures
- Detailed error logging for debugging

### User Experience
- Real-time validation feedback
- Clear error messages in the UI
- Toast notifications for success/error states

## Performance Considerations

### Batch Processing
- Resources processed sequentially to avoid rate limits
- Individual error handling to prevent total failure
- Progress indication for large batches

### Memory Management
- Efficient data structures for form state
- Proper cleanup of event listeners
- Optimized re-rendering with React best practices

### API Optimization
- Minimal data transfer with required fields only
- Efficient validation logic
- Proper error response formatting

## Usage Examples

### Basic Bulk Creation
```javascript
const resources = [
  {
    taskName: "Company Handbook",
    taskDescription: "Complete company handbook and policies",
    taskWeek: 1,
    taskDay: 1,
    taskMedium: "Doc",
    taskLink: "https://company.com/handbook"
  },
  {
    taskName: "Welcome Video",
    taskDescription: "Welcome message from CEO",
    taskWeek: 1,
    taskDay: 2,
    taskMedium: "Video",
    taskLink: "https://company.com/welcome"
  }
]

const response = await fetch('/api/admin/tasks/bulk-create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ resources, testMode: true })
})
```

### Testing with Invalid Data
```javascript
const invalidResources = [
  {
    taskName: "", // Invalid: empty name
    taskWeek: 10, // Invalid: out of range
    taskDay: 1,
    taskMedium: "InvalidType" // Invalid: not in allowed list
  }
]

// This will return a 400 error with validation details
```

## Troubleshooting

### Common Issues

#### "Unauthorised" Error
- Check that you're logged in as an admin
- Verify session cookie is valid
- Ensure session hasn't expired

#### Validation Errors
- Verify all required fields are filled
- Check that week/day numbers are between 0-5
- Ensure medium type is from the allowed list
- Validate URL format for resource links

#### Airtable Connection Issues
- Check environment variables (AIRTABLE_API_KEY, AIRTABLE_BASE_ID)
- Verify Airtable base permissions
- Check network connectivity

### Debug Mode
Set `NODE_ENV=development` to get detailed error messages in API responses.

## Future Enhancements

### Planned Features
- **Template System**: Save and reuse resource templates
- **Import/Export**: CSV import/export functionality
- **Bulk Edit**: Edit multiple resources at once
- **Advanced Validation**: Custom validation rules
- **Progress Tracking**: Real-time progress for large batches

### Performance Improvements
- **Parallel Processing**: Process resources in parallel where possible
- **Caching**: Cache validation results
- **Optimistic Updates**: Update UI before API confirmation

## Support

For issues or questions regarding the Bulk Create Resources feature:

1. Check the troubleshooting section above
2. Review the API documentation
3. Test with the provided test script
4. Check server logs for detailed error information

## Changelog

### Version 1.0.0 (Current)
- Initial implementation of bulk create resources
- Dynamic form interface with smart features
- Comprehensive validation and error handling
- Test mode for safe testing
- Full API documentation and test suite
