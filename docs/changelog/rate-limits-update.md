# Rate Limits Update - Internal Application Optimization

## Overview
Updated the rate limiting configuration to better suit internal application usage patterns. The changes focus on providing more reasonable limits for internal users while maintaining basic protection against accidental abuse.

## Changes Made

### Previous Configuration
- Strict rate limit: 5 requests per minute
- Relaxed rate limit: 60 requests per minute

### New Configuration
- Strict rate limit: 30 requests per minute
- Relaxed rate limit: 300 requests per minute

### Affected Endpoints
The following endpoints remain under stricter rate limiting:
- `/api/login`
- `/api/admin/login`
- `/api/sign-up`
- `/api/forgot-password`
- `/api/reset-password`
- `/api/admin/create-admin`

All other API endpoints use the relaxed rate limit.

## Rationale
1. **Internal Usage Context**
   - Application is used by internal staff
   - Users are trusted and authenticated
   - Operations often require multiple attempts (e.g., login, password reset)

2. **Improved User Experience**
   - Prevents unnecessary rate limit errors during normal usage
   - Allows for more natural usage patterns
   - Reduces friction in day-to-day operations

3. **Maintained Security**
   - Still provides protection against accidental infinite loops
   - Prevents rapid-fire requests that could indicate bugs
   - Maintains basic resource management

## Implementation Details
The changes were made in `src/middleware.js`:
```javascript
// Internal app rate limits: 30 req/min for sensitive endpoints, 300 req/min for others
const strictLimiter = rateLimiter(30, 60 * 1000);  // 30 requests per minute
const relaxedLimiter = rateLimiter(300, 60 * 1000); // 300 requests per minute
```

## Impact
- Reduced likelihood of rate limit errors during normal operation
- Better support for internal application usage patterns
- Maintained basic protection against abuse
- Improved user experience for internal staff

## Date
[Current Date] 