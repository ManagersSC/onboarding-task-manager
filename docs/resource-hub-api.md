# Resource Hub API Documentation

## Overview
The Resource Hub API endpoint provides access to onboarding resource files stored in Airtable. It is designed to serve the Resource Hub dashboard component, supporting file search and listing with a consistent data contract.

---

## Endpoint

```
GET /api/admin/dashboard/resource-hub
```

### Query Parameters
- `query` (optional): A string to search for files by their filename in the Airtable 'File(s)' field.
- `page` (optional): The page number for pagination (default: 1).
- `pageSize` (optional): The number of results per page (default: 5).

---

## Response
Returns a JSON object with the following structure:

| Field        | Type     | Description                                                      |
|--------------|----------|------------------------------------------------------------------|
| resources    | array    | Array of resource objects for the current page                   |
| totalCount   | number   | Total number of matching resources (for all pages)               |
| page         | number   | Current page number                                              |
| pageSize     | number   | Number of results per page                                       |

Each resource object has the following structure:

| Field      | Type   | Description                                                      |
|------------|--------|------------------------------------------------------------------|
| id         | string | Airtable record ID                                               |
| title      | string | File name or onboarding task title, or a placeholder if missing  |
| type       | string | Resource type (currently always `document`)                     |
| updatedAt  | string | ISO date string of record creation (used as updated time)        |

**Example Response:**
```json
{
  "resources": [
    {
      "id": "rec123...",
      "title": "Welcome Packet.pdf",
      "type": "document",
      "updatedAt": "2024-06-01T12:34:56.000Z"
    }
    // ... up to pageSize resources
  ],
  "totalCount": 12,
  "page": 1,
  "pageSize": 5
}
```

---

## Behavior
- **Default:** Returns up to `pageSize` most recent resources from the "Onboarding Tasks" table for the requested page.
- **Search:** If `query` is provided, returns up to `pageSize` resources whose file names in the 'File(s)' field contain the query (case-insensitive), for the requested page.
- **Pagination:** Use `page` and `pageSize` to navigate through results. `totalCount` indicates the total number of matching resources.
- **Error Handling:** Returns a 500 error with a message if Airtable credentials are missing or if fetching fails.

---

## Alignment with Dashboard Component
- The dashboard fetches from `/api/admin/dashboard/resource-hub` and expects the above data shape.
- Search input sends the `query` parameter to filter by file name.
- The dashboard displays at most 5 resources, matching the API's response limit.

---

## Edge Cases
- If no resources match the search, an empty array is returned.
- If a record has no files, it is excluded from search results.
- If the 'File(s)' field is missing or not an array, the record is ignored for search.

---

## Change Log
- 2024-06-07: Initial documentation created for API/dashboard alignment. 