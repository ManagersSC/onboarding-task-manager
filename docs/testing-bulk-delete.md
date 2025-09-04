# Testing Bulk Delete Applicants Feature

## Overview

This guide provides safe testing methods for the bulk delete applicants feature without affecting real data or triggering unwanted automations.

## Safety Measures

### 1. Test Mode
The API includes a `testMode` parameter that simulates deletions without actually removing data from Airtable.

```javascript
// Safe test request
{
  "applicantIds": ["rec123", "rec456"],
  "testMode": true
}
```

### 2. No Real Deletions in Test Mode
- ✅ Validates applicant IDs exist
- ✅ Simulates the deletion process
- ✅ Returns success/failure counts
- ✅ Logs test operations (not audit events)
- ❌ Does NOT actually delete from Airtable
- ❌ Does NOT trigger automations

## Testing Methods

### Method 1: Browser Developer Tools (Recommended)

1. **Login as Admin**
   - Navigate to your app and login as an admin user

2. **Open Developer Tools**
   - Press F12 or right-click → Inspect
   - Go to the Console tab

3. **Test the API Directly**
   ```javascript
   // Test with fake IDs (safe)
   fetch('/api/admin/users/bulk-delete', {
     method: 'DELETE',
     headers: {
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({
       applicantIds: ['rec_fake_001', 'rec_fake_002'],
       testMode: true
     })
   })
   .then(response => response.json())
   .then(data => console.log('Test result:', data))
   .catch(error => console.error('Error:', error))
   ```

4. **Test with Real IDs (Still Safe in Test Mode)**
   ```javascript
   // Get real applicant IDs from your table
   const realIds = ['rec_real_id_1', 'rec_real_id_2'] // Replace with actual IDs
   
   fetch('/api/admin/users/bulk-delete', {
     method: 'DELETE',
     headers: {
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({
       applicantIds: realIds,
       testMode: true
     })
   })
   .then(response => response.json())
   .then(data => console.log('Test result:', data))
   ```

### Method 2: Test Script

1. **Run the Test Script**
   ```bash
   node scripts/test-bulk-delete.js
   ```

2. **For Authenticated Testing**
   - Login to your app
   - Copy your session cookie from browser dev tools
   - Edit the script to include the cookie
   - Run the script again

### Method 3: Frontend UI Testing

1. **Enable Test Mode in UI**
   - Temporarily modify the `BulkDeleteModal` component
   - Add `testMode: true` to the API request
   - Test the full user flow safely

2. **Test the Complete Flow**
   - Select applicants in the table
   - Click the delete button
   - Confirm in the modal
   - Verify the test mode response

## Test Scenarios

### Scenario 1: Valid Test Data
```javascript
{
  "applicantIds": ["rec_test_001", "rec_test_002"],
  "testMode": true
}
```
**Expected Result**: Success with test mode message

### Scenario 2: Invalid IDs
```javascript
{
  "applicantIds": ["rec_nonexistent_001"],
  "testMode": true
}
```
**Expected Result**: Success (test mode doesn't validate existence)

### Scenario 3: Empty Array
```javascript
{
  "applicantIds": [],
  "testMode": true
}
```
**Expected Result**: 400 error - "Invalid request: applicantIds is required"

### Scenario 4: Malformed Request
```javascript
{
  "testMode": true
  // Missing applicantIds
}
```
**Expected Result**: 400 error - "Invalid request: applicantIds is required"

### Scenario 5: Unauthorized Access
```javascript
// Request without valid session cookie
{
  "applicantIds": ["rec_test_001"],
  "testMode": true
}
```
**Expected Result**: 401 error - "Unauthorised"

## Production Testing

### Before Going Live

1. **Test with Real Data (Test Mode)**
   ```javascript
   // Use actual applicant IDs from your Airtable
   const realApplicantIds = ['rec_actual_id_1', 'rec_actual_id_2']
   
   fetch('/api/admin/users/bulk-delete', {
     method: 'DELETE',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       applicantIds: realApplicantIds,
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
   - Ensure `testMode: false` (default)
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
   - Check applicantIds is an array
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

## Support

If you encounter issues:
1. Check the troubleshooting section
2. Review server logs
3. Test with the provided scripts
4. Verify environment configuration
