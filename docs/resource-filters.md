## ResourcePage filters: Job and Folder

This change adds two new filters to the admin Resources page:

- Job: filters tasks by the associated Job title (not the record ID).
- Folder: filters tasks by the Onboarding Folder name.

### UI

- Location: `components/tasks/TasksTable.js`
- New dropdowns in the header controls:
  - Job (by title): populated from the current page’s unique `task.jobTitle` values.
  - Folder (by name): populated from the current page’s unique `task.folderName` values.
- Active filter pills show when a filter is applied and can be cleared.

### API

- Location: `src/app/api/admin/tasks/core-tasks/route.js`
- New query parameters:
  - `jobTitle`: string, case-insensitive exact match on `Jobs.Title`
  - `folderName`: string, case-insensitive exact match on `Onboarding Folders.Name`

When either parameter is present, the API resolves titles to Airtable record IDs, then adds them to the `filterByFormula` used for querying `Onboarding Tasks`:

- Jobs (table: “Jobs”, field: “Title” in `ATS_schema.txt`)
  - Resolve IDs where `LOWER({Title}) = LOWER('<jobTitle>')`.
  - Apply `OR({Job} = 'rec...', ...)` against the `Onboarding Tasks` linked field `{Job}`.

- Onboarding Folders (table: “Onboarding Folders”, field: “Name” in `ATS_schema.txt`)
  - Resolve IDs where `LOWER({Name}) = LOWER('<folderName>')`.
  - Apply `OR({Folder Name} = 'rec...', ...)` against the `Onboarding Tasks` linked field `{Folder Name}`.

If a provided title/name doesn’t resolve to any record IDs, the API adds `FALSE()` to the conditions to return an empty result set quickly.

### Query examples

Fetch “Receptionist” tasks in “Communication & Admin” folder, 10 per page:

```
/api/admin/tasks/core-tasks?pageSize=10&jobTitle=Receptionist&folderName=Communication%20%26%20Admin
```

Combine with existing filters (e.g., Week/Day):

```
/api/admin/tasks/core-tasks?week=2&day=3&jobTitle=Receptionist&folderName=Communication%20%26%20Admin
```

### Notes and limitations

- Matching is case-insensitive and exact for both job titles and folder names.
- The UI options are derived from the currently loaded page of results; if a desired job/folder isn’t listed, clear other filters or search to expand the result set.
- The API still supports the previous `jobRole` parameter (record ID) for backward compatibility, but the UI now uses `jobTitle`.

### Schema references (from `docs/ATS_schema.txt`)

- Jobs: table “Jobs”, field `Title`.
- Onboarding Folders: table “Onboarding Folders”, field `Name`.
- Onboarding Tasks: linked fields `{Job}`, `{Folder Name}`.


