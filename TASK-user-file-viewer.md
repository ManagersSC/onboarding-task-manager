# User File Viewer for Dashboard

**Branch:** `feat/user-file-viewer`

Add a file viewer to the user dashboard so users can view task attachments and resource links, similar to the admin file viewer but read-only.

## Sub-tasks

- [x] Create user-facing API endpoint (`/api/user/tasks/[logId]/files`) to fetch attachments from linked core task
- [x] Update `/api/get-tasks` to return `coreTaskId` and `hasDocuments`
- [x] Create read-only `UserFileViewerModal` component (view + download, no upload/rename/delete)
- [x] Update `TaskCard` with files/resources button that opens the viewer
- [x] Update `FolderCard` task modal with files button per task row
- [x] Wire up file viewer state in dashboard page
