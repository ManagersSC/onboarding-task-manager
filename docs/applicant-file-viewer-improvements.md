# Applicant File Viewer Improvements

## Overview

This document outlines the improvements made to the Applicant File Viewer Modal to address various user experience issues and technical problems.

## Issues Fixed

### 1. File Size Display
**Problem**: File sizes were only displayed in KB, even for large files that should be shown in MB.

**Solution**: 
- Enhanced the `formatFileSize` function to show MB for files larger than 1MB
- Improved readability by showing whole numbers for KB and decimal places for MB/GB
- Files now display as "2.5 MB" instead of "2560 KB"

### 2. File Type Display
**Problem**: Office documents like .docx files showed verbose MIME types like "application/vnd.openxmlformats-officedocument.wordprocessingml.document".

**Solution**:
- Enhanced the `getFriendlyFileType` function to provide user-friendly file type names
- Office documents now display as "Word Document (.docx)", "Excel Spreadsheet (.xlsx)", etc.
- Added comprehensive MIME type and file extension mapping

### 3. Next.js Image Hostname Configuration
**Problem**: Airtable image URLs were blocked by Next.js image optimization, causing errors like:
```
Error: Invalid src prop on `next/image`, hostname "v5.airtableusercontent.com" is not configured
```

**Solution**:
- Added Airtable image hostnames to `next.config.mjs`:
  - `v5.airtableusercontent.com`
  - `dl.airtable.com`
- Images from Airtable now load properly in the file viewer

### 4. Office Document Preview
**Problem**: .docx and other Office documents attempted to show previews, which don't work in browsers.

**Solution**:
- Added special handling for Office document extensions (.docx, .doc, .xlsx, .xls, .pptx, .ppt)
- Office documents now show a clear message: "Preview not available for Office documents"
- Users are directed to use the download button to view these files

### 5. Multiple Files with Same Name
**Problem**: When multiple files were uploaded to the same field (e.g., multiple testimonials), they all had the same display name.

**Solution**:
- Added automatic numbering for multiple files in the same field
- Files now display as "Testimonials (1)", "Testimonials (2)", etc.
- Applied to both initial application documents and feedback documents
- Single files retain their original names without numbering

## Technical Implementation

### File Size Formatting
```javascript
const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return "Unknown"
  
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  
  // For better readability, show MB for files larger than 1MB
  if (i >= 2) {
    return `${Math.round((bytes / Math.pow(1024, i)) * 100) / 100} ${sizes[i]}`
  } else {
    // For KB, show whole numbers
    return `${Math.round(bytes / Math.pow(1024, i))} ${sizes[i]}`
  }
}
```

### File Type Detection
```javascript
const getFriendlyFileType = (mimeType, fileName) => {
  // Enhanced MIME type mapping for Office documents
  if (mimeType.includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document")) {
    return "Word Document (.docx)"
  }
  // ... additional mappings
}
```

### Next.js Configuration
```javascript
// next.config.mjs
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'v5.airtableusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'dl.airtable.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // ... other config
}
```

### Multiple File Numbering
```javascript
// Add numbering for multiple files in the same field
const displayName = attachments.length > 1 ? `${doc.name} (${index + 1})` : doc.name

allDocuments.push({
  id: `${doc.key}-${index}`,
  name: displayName, // Numbered name
  originalName: fileName, // Original filename preserved
  // ... other properties
})
```

## User Experience Improvements

### Visual Enhancements
- **Better File Icons**: Office documents now have distinct colored icons (blue for Word, green for Excel, orange for PowerPoint)
- **Clearer Messages**: Office documents show helpful messages about preview limitations
- **Improved Typography**: File information is better organized and more readable

### Functionality Improvements
- **Accurate File Sizes**: Users can now easily understand file sizes in appropriate units
- **Better File Type Recognition**: Clear, user-friendly file type names
- **Proper Image Loading**: Airtable images now load without errors
- **Organized File Lists**: Multiple files in the same field are clearly numbered

## Testing

### Test Cases
1. **File Size Display**: Verify files > 1MB show in MB, smaller files show in KB
2. **Office Documents**: Confirm .docx files show proper type and no preview attempt
3. **Image Loading**: Test that Airtable images load without hostname errors
4. **Multiple Files**: Verify numbering appears for multiple files in same field
5. **Single Files**: Confirm single files don't get unnecessary numbering

### Browser Compatibility
- Chrome, Firefox, Safari, Edge
- Mobile browsers (iOS Safari, Chrome Mobile)
- File download functionality across all browsers

## Future Enhancements

### Potential Improvements
1. **File Preview Enhancement**: Consider integrating with Microsoft Office Online or Google Docs for Office document previews
2. **File Type Icons**: Add more specific icons for different file types
3. **File Search**: Add search functionality within the file viewer
4. **Bulk Operations**: Allow downloading multiple files at once
5. **File Metadata**: Show more detailed file information when available

### Performance Considerations
- Image optimization for large files
- Lazy loading for file previews
- Caching strategies for frequently accessed files

## Related Documentation
- [Applicant File Viewer Modal](./applicant-file-viewer-modal.md)
- [Applicant Documents Multiple Files Fix](./applicant-documents-multiple-files-fix.md)
- [API Reference](./API_REFERENCE.md)
