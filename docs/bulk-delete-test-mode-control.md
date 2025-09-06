# Bulk Delete Test Mode Control

## Overview

The bulk delete functionality now uses a **single source of control** for test mode, eliminating confusion and potential inconsistencies between frontend and backend implementations.

## How It Works

### Environment Variable Control

Test mode is controlled by a single environment variable: `BULK_DELETE_TEST_MODE`

- **`BULK_DELETE_TEST_MODE=true`**: Enables test mode (simulation only)
- **`BULK_DELETE_TEST_MODE=false`** or **unset**: Production mode (actual deletion)

### Implementation

#### Frontend (BulkDeleteTasksModal.jsx)
- **No longer sends `testMode` parameter** in API requests
- Automatically adapts to backend test mode setting
- Shows appropriate success messages based on API response

#### Backend (API Handlers)
- **Tasks**: `src/app/api/admin/tasks/bulk-delete/route.js`
- **Users**: `src/app/api/admin/users/bulk-delete/route.js`
- Both read `process.env.BULK_DELETE_TEST_MODE` to determine behavior
- Default to production mode (`false`) when environment variable is not set

## Configuration

### Setting Test Mode

Add to your `.env.local` file:

```bash
# For testing (simulation only)
BULK_DELETE_TEST_MODE=true

# For production (actual deletion)
BULK_DELETE_TEST_MODE=false
```

### Environment-Specific Settings

#### Development
```bash
# .env.development.local
BULK_DELETE_TEST_MODE=true
```

#### Production
```bash
# .env.production.local
BULK_DELETE_TEST_MODE=false
```

## Behavior

### Test Mode (`BULK_DELETE_TEST_MODE=true`)
- ✅ Simulates deletion without affecting data
- ✅ Logs "TEST MODE" messages
- ✅ Returns success response with test indicators
- ✅ **No audit logging** (prevents test noise)
- ✅ Safe for development and testing

### Production Mode (`BULK_DELETE_TEST_MODE=false` or unset)
- ✅ Performs actual deletion from Airtable
- ✅ Logs real deletion events
- ✅ **Full audit logging** for compliance
- ✅ Returns production success messages
- ✅ Ready for live data

## Benefits

### Single Source of Truth
- ✅ One environment variable controls all bulk delete operations
- ✅ No frontend/backend parameter mismatches
- ✅ Consistent behavior across all bulk delete features

### Simplified Management
- ✅ Easy to toggle between test and production modes
- ✅ Environment-specific configuration
- ✅ No code changes needed to switch modes

### Safety
- ✅ Prevents accidental production deletions during testing
- ✅ Clear separation between test and production behavior
- ✅ Audit logging only in production mode

## Migration Notes

### What Changed
1. **Frontend**: Removed `testMode` parameter from API requests
2. **Backend**: Added environment variable reading for test mode
3. **Documentation**: Updated configuration guide

### Backward Compatibility
- ✅ Existing API calls without `testMode` parameter work correctly
- ✅ Default behavior is production mode (safe)
- ✅ No breaking changes for existing functionality

## Troubleshooting

### Test Mode Not Working
1. Check environment variable is set: `echo $BULK_DELETE_TEST_MODE`
2. Verify `.env.local` file contains the variable
3. Restart development server after adding environment variable

### Still Getting "TEST" Messages
1. Ensure `BULK_DELETE_TEST_MODE=false` in production
2. Check environment variable is properly loaded
3. Verify API handler is reading the correct environment

### Environment Variable Not Loading
1. Check file is named `.env.local` (not `.env`)
2. Ensure variable is in correct format: `BULK_DELETE_TEST_MODE=true`
3. Restart the application after changes

## Examples

### Development Testing
```bash
# .env.local
BULK_DELETE_TEST_MODE=true
NODE_ENV=development
```

### Production Deployment
```bash
# Production environment
BULK_DELETE_TEST_MODE=false
NODE_ENV=production
```

### Vercel Deployment
Set in Vercel dashboard:
- `BULK_DELETE_TEST_MODE` = `false`
- `NODE_ENV` = `production`

---

[← Back to Configuration](./CONFIGURATION.md) | [API Reference →](./API_REFERENCE.md)
