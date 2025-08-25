# Applicant File Viewer Modal

## Overview

The Applicant File Viewer Modal is a new feature that allows administrators to view and download documents and feedback files directly from the applicant drawer. This modal provides a clean, user-friendly interface for file management within the applicant tracking system.

## Features

### File Preview
- **Image Files**: Direct preview with responsive sizing
- **PDF Files**: Embedded PDF viewer using iframe
- **Text Files**: Information about text preview availability
- **Other Files**: Generic file icon with type information

### File Details
- **Basic Information**: File name, type, size, and upload date
- **Document Metadata**: Category, source, and status information
- **Organized Layout**: Clean grid layout for easy scanning

### File Operations
- **Download**: Direct file download with proper filename preservation
- **Open in New Tab**: External viewing for supported file types
- **Error Handling**: Graceful fallbacks for failed operations

## Components

### Main Modal Component
```jsx
<ApplicantFileViewerModal
  file={selectedFile}
  open={fileViewerOpen}
  onOpenChange={handleFileViewerClose}
/>
```

### File Type Detection
The modal automatically detects file types based on:
- MIME type information
- File extension analysis
- Fallback to generic file type

### File Preview Components
- `FilePreview`: Main preview area with type-specific rendering
- `FileDetails`: Detailed metadata display
- `FileIcon`: Dynamic icon based on file type

## Integration

### In Applicant Drawer
The modal is integrated into the applicant drawer with:
- **Documents Tab**: View button (👁️) for each document
- **Feedback Tab**: View button for feedback files
- **State Management**: Local state for selected file and modal visibility

### File Click Handler
```jsx
const handleFileClick = (file) => {
  setSelectedFile(file)
  setFileViewerOpen(true)
}
```

## Data Structure

### Expected File Object
```javascript
{
  id: "unique-id",
  name: "Document Name",
  originalName: "original_filename.pdf",
  category: "Application",
  source: "Initial Application",
  status: "Uploaded",
  type: "application/pdf",
  size: 1024000, // bytes
  uploadedAt: "2024-01-15T10:30:00Z",
  fileUrl: "https://example.com/file.pdf"
}
```

### File URL Handling
The modal supports multiple URL field names:
- `fileUrl` (primary)
- `url` (fallback)

## User Experience

### Loading States
- **Initial Load**: 500ms loading simulation for smooth UX
- **Download Loading**: Spinner during file download operations
- **Error States**: Clear error messages with actionable information

### Responsive Design
- **Modal Size**: Maximum 700px width, 90% viewport height
- **Content Areas**: Preview and details tabs with proper spacing
- **Button Layout**: Responsive button arrangement for different screen sizes

### Accessibility
- **Keyboard Navigation**: Full keyboard support for modal interaction
- **Screen Reader**: Proper ARIA labels and descriptions
- **Focus Management**: Automatic focus handling for modal elements

## Technical Implementation

### State Management
```javascript
const [selectedFile, setSelectedFile] = useState(null)
const [fileViewerOpen, setFileViewerOpen] = useState(false)
const [loading, setLoading] = useState(false)
const [error, setError] = useState(null)
```

### File Download Process
1. Fetch file as blob from URL
2. Create object URL for download
3. Trigger download with proper filename
4. Cleanup object URL after download

### Error Handling
- **Network Errors**: Fetch failure handling with user feedback
- **File Type Errors**: Graceful fallbacks for unsupported types
- **URL Errors**: Clear messaging for missing file URLs

## Styling

### Design System Integration
- **Shadcn/ui Components**: Consistent with existing UI components
- **Tailwind CSS**: Responsive utility classes
- **Icon System**: Lucide React icons for consistency

### Color Scheme
- **Primary Colors**: Brand colors for interactive elements
- **Status Colors**: Semantic colors for file types and states
- **Muted Colors**: Subtle colors for secondary information

## Browser Compatibility

### Supported Features
- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest versions)
- **File Download**: Blob-based download with fallback support
- **PDF Preview**: Iframe-based PDF viewing
- **Image Preview**: Next.js Image component optimization

### Fallbacks
- **Unsupported File Types**: Generic file icon and information
- **Download Failures**: Clear error messages with alternative actions
- **Preview Failures**: Graceful degradation to file details

## Future Enhancements

### Planned Features
- **File Thumbnails**: Preview images for document types
- **Batch Operations**: Multiple file selection and operations
- **File History**: Track file changes and versions
- **Advanced Search**: Search within file contents

### Performance Optimizations
- **Lazy Loading**: Load file content on demand
- **Caching**: Implement file content caching
- **Progressive Loading**: Stream large files for better UX

## Troubleshooting

### Common Issues

#### File Not Loading
- Check file URL accessibility
- Verify CORS settings for external files
- Ensure file format is supported

#### Download Not Working
- Check browser download settings
- Verify file permissions
- Test with different file types

#### Preview Not Displaying
- Check file format support
- Verify file URL validity
- Check browser console for errors

### Debug Information
The modal includes comprehensive error logging:
- Network request failures
- File type detection issues
- Download operation errors

## API Integration

### File Endpoints
The modal works with existing file endpoints:
- `/api/admin/users/[id]` - Applicant data with documents
- File URLs from Airtable attachments
- Feedback file metadata

### Data Flow
1. **Applicant Data**: Fetched via `useApplicant` hook
2. **File Selection**: User clicks view button on file item
3. **Modal Display**: File data passed to modal component
4. **File Operations**: Download and preview operations

## Security Considerations

### File Access
- **Authentication**: Admin-only access through existing auth system
- **File Validation**: URL validation before file operations
- **Download Limits**: Consider implementing download rate limiting

### Data Privacy
- **File Metadata**: Only display non-sensitive information
- **URL Security**: Validate file URLs for security
- **Access Logging**: Track file access for audit purposes

## Testing

### Component Testing
- **Unit Tests**: Individual component functionality
- **Integration Tests**: Modal integration with applicant drawer
- **User Tests**: End-to-end file viewing workflows

### Test Scenarios
- **File Types**: Test all supported file formats
- **Error States**: Test network failures and invalid files
- **User Interactions**: Test modal open/close and navigation
- **Responsive Design**: Test on different screen sizes

## Deployment

### Build Requirements
- **Next.js**: Version 13+ for app directory support
- **React**: Version 18+ for hooks and state management
- **Dependencies**: Ensure all UI components are available

### Environment Variables
No additional environment variables required beyond existing configuration.

### Build Process
The modal is included in the main application bundle and requires no special build steps.

