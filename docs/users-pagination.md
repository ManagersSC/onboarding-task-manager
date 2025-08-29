# Users Page Pagination

## Overview
The Users page now supports comprehensive pagination for browsing and searching applicants. This allows users to navigate through large sets of applicants efficiently, both in the UI and via the API.

---

## API Usage
- **Endpoint:** `/api/admin/users`
- **Query Parameters:**
  - `page` (optional): Page number (default: 1)
  - `pageSize` (optional): Number of results per page (default: 25, max: 100)
  - `search` (optional): Search string for name, email, phone, job, or address
  - `stage` (optional): Filter by applicant stage
  - `sortBy` (optional): Field to sort by (default: 'Created Time')
  - `sortOrder` (optional): Sort direction 'asc' or 'desc' (default: 'desc')

**Example:**
```
GET /api/admin/users?page=2&pageSize=25&search=john&stage=interview
```

**Response:**
```json
{
  "applicants": [ ... ],
  "pagination": {
    "page": 2,
    "pageSize": 25,
    "total": 150,
    "totalPages": 6,
    "hasNext": true,
    "hasPrev": true
  },
  "metadata": {
    "filterApplied": "AND(OR(...), OR(...))",
    "searchTerm": "john",
    "stageFilter": "interview"
  }
}
```

- `applicants`: Array of applicant objects for the current page
- `pagination`: Pagination information
  - `page`: Current page number
  - `pageSize`: Number of results per page
  - `total`: Total number of matching applicants
  - `totalPages`: Total number of pages
  - `hasNext`: Whether there's a next page
  - `hasPrev`: Whether there's a previous page
- `metadata`: Debug information about applied filters

---

## UI Features

### Page Size Selection
- Users can select from predefined page sizes: 10, 25, 50, or 100 applicants per page
- Default page size is 25 applicants
- Page size selector is located in the search and filters section
- Changing page size automatically resets to page 1

### Pagination Controls
- Previous/Next navigation buttons
- Current page indicator (e.g., "Page 2 of 6")
- Results counter (e.g., "Showing 26 to 50 of 150 applicants")
- Buttons are disabled when at first/last page or while loading

### Search and Filtering
- Real-time search across multiple fields (name, email, phone, job, address)
- Stage-based filtering with grouped options
- Search and filters work seamlessly with pagination
- Results update automatically when filters change

### Performance Optimizations
- Debounced search (500ms delay) to reduce API calls
- Server-side pagination to avoid loading large datasets
- Caching for better performance
- Loading states during data fetching

---

## Implementation Details

### API Changes
- Changed from `limit` parameter to `pageSize` for consistency
- Updated default page size from 20 to 25
- Increased maximum page size from 50 to 100
- Enhanced pagination response structure

### Hook Updates
- `useApplicants` hook updated to use `pageSize` instead of `limit`
- Default page size changed to 25
- Improved parameter handling and caching

### Component Updates
- Added page size selector to search and filters section
- Enhanced pagination display with detailed information
- Improved loading states and error handling
- Better responsive design for mobile devices

---

## Best Practices

### For Users
- Use the page size selector to optimize for your workflow
- Combine search and stage filters to quickly find specific applicants
- Use pagination to navigate through large applicant lists efficiently

### For Developers
- The API always returns pagination metadata for building custom controls
- Page size changes reset to page 1 to avoid confusion
- Search is debounced to prevent excessive API calls
- Loading states provide clear feedback during data fetching

---

## Change Log
- **2024-12-19:** Pagination added to Users page with page size selection
- **2024-12-19:** Updated API to use `pageSize` parameter with 25 default
- **2024-12-19:** Enhanced pagination controls with detailed information
- **2024-12-19:** Added page size selector (10, 25, 50, 100 options)

---

## Related Documentation
- [Resource Hub Pagination](./resource-hub-pagination.md)
- [API Reference](./API_REFERENCE.md)
- [Users Page Implementation](./users-page.md)
