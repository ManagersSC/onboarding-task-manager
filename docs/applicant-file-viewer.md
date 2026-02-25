# Applicant File Viewer

Administrators can view and download applicant documents and feedback files directly from the applicant drawer.

## Features

- **Image files**: Direct preview with responsive sizing
- **PDF files**: Embedded PDF viewer (iframe)
- **Office documents** (.docx, .xlsx, .pptx): Preview not supported in browser — download to view
- **Other files**: Generic file icon with type information
- **File details**: Name, type (human-friendly), size (KB/MB), upload date, category, source, status
- **Download**: Blob-based download with correct filename preserved
- **Open in new tab**: For supported file types
- **Multiple files per field**: Automatically numbered (e.g., "Testimonials (1)", "Testimonials (2)")

## Integration

The modal is embedded in the applicant drawer:

- **Documents tab**: Eye (👁️) button on each document row
- **Feedback tab**: Eye button on each feedback file

```jsx
{selectedFile && (
  <ApplicantFileViewerModal
    file={selectedFile}
    open={fileViewerOpen}
    onOpenChange={handleFileViewerClose}
  />
)}
```

## File Object Structure

```javascript
{
  id: "unique-id",
  name: "Document Name",           // may be numbered: "Testimonials (1)"
  originalName: "original.pdf",
  category: "Application",
  source: "Initial Application",
  status: "Uploaded",
  type: "application/pdf",
  size: 1024000,                   // bytes
  uploadedAt: "2024-01-15T10:30:00Z",
  fileUrl: "https://...",          // primary; falls back to `url`
}
```

## API Integration

- **Data source**: `GET /api/admin/users/[id]` — returns applicant record with all document fields
- **File URLs**: Airtable attachment URLs (`v5.airtableusercontent.com`, `dl.airtable.com`)

## Accessibility

- Modal only renders when a file is selected (`{selectedFile && <Modal />}`)
- `DialogTitle` is always populated (falls back to "Document Viewer")
- Full keyboard navigation and screen reader support

## Components

| Component | Location |
|-----------|----------|
| `ApplicantFileViewerModal` | `components/admin/users/applicant-file-viewer-modal.js` |
| `ApplicantDrawer` (host) | `components/admin/users/applicant-drawer.js` |
