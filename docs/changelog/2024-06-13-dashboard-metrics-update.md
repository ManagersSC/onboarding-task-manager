# 2024-06-13: Dashboard Metrics Update

## Summary
- Removed "Completion Rate" and "Blocked Items" from the admin dashboard quick metrics.
- Implemented real logic for "Tasks Due This Week" using Airtable data.
- Only two metrics are now shown: Active Onboardings and Tasks Due This Week.
- Updated backend API, frontend component, and documentation for clarity and security.

## Details
- The `/api/admin/dashboard/quick-metrics` endpoint now returns only the two required metrics, with proper admin authentication and server-side caching.
- The frontend `QuickMetrics` component displays only these two metrics.
- Documentation and API references have been updated to reflect this change. 