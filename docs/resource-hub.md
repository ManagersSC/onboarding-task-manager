# Resource Hub

The Resource Hub allows users to browse and search onboarding resource files stored in Airtable.

## API

```
GET /api/admin/dashboard/resource-hub
```

### Query Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `query` | — | Search string; filters by file name (case-insensitive) |
| `page` | `1` | Page number for pagination |
| `pageSize` | `5` | Results per page |

**Example:**
```
GET /api/admin/dashboard/resource-hub?page=2&pageSize=5&query=onboarding
```

### Response

```json
{
  "resources": [
    {
      "id": "rec123...",
      "title": "Welcome Packet.pdf",
      "type": "document",
      "updatedAt": "2024-06-01T12:34:56.000Z"
    }
  ],
  "totalCount": 12,
  "page": 2,
  "pageSize": 5
}
```

**Behaviour:**
- Without `query`: returns the most recent `pageSize` resources from the `Onboarding Tasks` table for the requested page
- With `query`: filters to resources whose file names contain the search string
- Records with no files are excluded from search results
- Empty search returns an empty `resources` array, not an error
- Returns `500` if Airtable credentials are missing or the fetch fails

## UI

The Resource Hub dashboard component:
- Displays up to 5 resources (matching the default `pageSize`)
- Search input sends the `query` param to filter by file name
- Previous/Next pagination buttons; disabled on first/last page or while loading
- Pagination works with or without an active search

## Filters (Admin Resources Page)

The admin Resources page (`/admin/resources`) supports two additional filters via dropdowns:

| Filter | API Param | Behaviour |
|--------|-----------|-----------|
| Job | `jobTitle` | Case-insensitive exact match on `Jobs.Title` |
| Folder | `folderName` | Case-insensitive exact match on `Onboarding Folders.Name` |

API endpoint: `GET /api/admin/tasks/core-tasks`

The API resolves titles to Airtable record IDs, then filters the `Onboarding Tasks` table via `filterByFormula`. If a title doesn't resolve to any record, `FALSE()` is appended and an empty result set is returned immediately.

**Combining filters:**
```
/api/admin/tasks/core-tasks?week=2&day=3&jobTitle=Receptionist&folderName=Communication%20%26%20Admin
```

**Notes:**
- Filter options in the UI dropdowns are populated from the currently loaded page of results. If a desired job/folder isn't visible, clear other filters to expand the result set.
- The legacy `jobRole` parameter (record ID) is still supported for backward compatibility but the UI uses `jobTitle`.

## Key Files

- `components/dashboard/ResourceHub.js` — Dashboard widget
- `src/app/api/admin/dashboard/resource-hub/route.js` — API handler
- `src/app/api/admin/tasks/core-tasks/route.js` — Core tasks API with job/folder filters
- `components/tasks/TasksTable.js` — Resources page table with filter dropdowns
