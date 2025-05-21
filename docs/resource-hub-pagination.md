# Resource Hub Pagination

## Overview
The Resource Hub now supports pagination for browsing and searching resources. This allows users to navigate through large sets of files efficiently, both in the UI and via the API.

---

## API Usage
- **Endpoint:** `/api/admin/dashboard/resource-hub`
- **Query Parameters:**
  - `page` (optional): Page number (default: 1)
  - `pageSize` (optional): Number of results per page (default: 5)
  - `query` (optional): Search string for file name

**Example:**
```
GET /api/admin/dashboard/resource-hub?page=2&pageSize=5&query=onboarding
```

**Response:**
```
{
  "resources": [ ... ],
  "totalCount": 12,
  "page": 2,
  "pageSize": 5
}
```

- `resources`: Array of resource objects for the current page
- `totalCount`: Total number of matching resources
- `page`: Current page number
- `pageSize`: Number of results per page

---

## UI Behavior
- The Resource Hub dashboard component displays pagination controls (Previous/Next buttons and page info).
- Users can navigate between pages of results.
- The UI disables navigation buttons when on the first or last page, or while loading.
- Pagination works with or without a search query.

---

## Best Practices
- Use pagination to avoid loading too many resources at once, improving performance and usability.
- When searching, refine your query to quickly find relevant files.
- The API always returns the total count, so you can build custom pagination controls if needed.

---

## Change Log
- **2024-06-07:** Pagination added to Resource Hub API and UI. 