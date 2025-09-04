# Bulk Delete Applicants Feature

## Overview

The bulk delete applicants feature allows administrators to select multiple applicants from the users page and delete them in a single operation. This feature includes a confirmation modal to prevent accidental deletions and provides detailed feedback about the operation results.

## Features

### Selection Interface
- **Individual Selection**: Users can select individual applicants using checkboxes in the table
- **Select All**: A master checkbox in the table header allows selecting/deselecting all visible applicants
- **Visual Feedback**: Selected applicants are clearly indicated with checked checkboxes

### Bulk Delete Button
- **Conditional Display**: The "Delete" button only appears when one or more applicants are selected
- **Dynamic Count**: The button shows the number of selected applicants (e.g., "Delete (3)")
- **Positioning**: Located in the header area, aligned with other action buttons

### Confirmation Modal
- **Detailed Information**: Shows the names of selected applicants (up to 3, with "and X more" for additional)
- **Clear Warning**: Prominent warning about the irreversible nature of the action
- **Loading State**: Shows loading spinner and disables buttons during deletion
- **Error Handling**: Displays appropriate error messages if deletion fails

### API Integration
- **Bulk Operation**: Single API call handles deletion of multiple applicants
- **Partial Success Handling**: Reports both successful and failed deletions
- **Audit Logging**: All bulk delete operations are logged for audit purposes
- **Error Recovery**: Continues processing even if some deletions fail

## Technical Implementation

### Components

#### `BulkDeleteModal` (`components/admin/users/bulk-delete-modal.jsx`)
- Modal dialog for confirming bulk delete operations
- Handles the actual API call to delete applicants
- Provides user feedback through toast notifications
- Manages loading states during the operation

#### Updated `UsersTable` (`components/admin/users/users-table.js`)
- Enhanced selection state management
- Exposes selection changes to parent component
- Maintains existing functionality while adding bulk operations support

#### Updated `ApplicantsPage` (`components/admin/users/users-page.js`)
- Manages selected applicants state
- Renders conditional bulk delete button
- Coordinates between table selection and delete modal

### API Endpoint

#### `DELETE /api/admin/users/bulk-delete`
- **Authentication**: Requires admin session
- **Input**: JSON body with `applicantIds` array
- **Output**: Success/failure status with detailed counts
- **Error Handling**: Comprehensive error reporting and logging

```javascript
// Request
{
  "applicantIds": ["rec123", "rec456", "rec789"]
}

// Response
{
  "success": true,
  "message": "3 applicants deleted successfully",
  "deletedIds": ["rec123", "rec456", "rec789"],
  "failedIds": [],
  "deletedCount": 3,
  "failedCount": 0
}
```

## User Experience

### Workflow
1. **Select Applicants**: User checks boxes next to applicants they want to delete
2. **Delete Button Appears**: "Delete (X)" button appears in the header
3. **Click Delete**: User clicks the delete button
4. **Confirmation Modal**: Modal opens showing selected applicants and warning
5. **Confirm Deletion**: User confirms the deletion
6. **Processing**: System shows loading state while processing
7. **Feedback**: Toast notification shows results
8. **Refresh**: Table refreshes to show updated data

### Safety Features
- **Confirmation Required**: No accidental deletions without explicit confirmation
- **Clear Warnings**: Prominent warnings about data loss
- **Detailed Preview**: Shows exactly which applicants will be deleted
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

### Unit Tests
- Component rendering with different selection states
- API endpoint validation and error handling
- Modal interaction flows

### Integration Tests
- End-to-end bulk delete workflow
- Error handling scenarios
- Authentication and authorization

### User Acceptance Tests
- Selection interface usability
- Confirmation modal clarity
- Error message appropriateness

## Future Enhancements

### Potential Improvements
- **Undo Functionality**: Temporary undo for recently deleted applicants
- **Batch Size Limits**: Configurable limits on bulk operation sizes
- **Advanced Filtering**: Delete all applicants matching certain criteria
- **Export Before Delete**: Option to export data before deletion

### Performance Optimizations
- **Pagination Awareness**: Handle large selections across multiple pages
- **Progress Indicators**: Real-time progress for large bulk operations
- **Background Processing**: Queue large operations for background processing

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
- No feature flags currently implemented
- Could be added for gradual rollout or A/B testing

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

## Troubleshooting

### Common Issues
1. **Selection Not Working**: Check if checkboxes are properly bound to state
2. **Delete Button Not Appearing**: Verify selection state is being updated
3. **API Errors**: Check authentication and Airtable connectivity
4. **Partial Failures**: Review audit logs for specific failure reasons

### Debug Information
- Browser console logs for frontend issues
- Server logs for API and authentication issues
- Audit logs for operation details and failures
