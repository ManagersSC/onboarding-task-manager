# Feedback Documents Integration

## Overview

This feature integrates feedback documents from the Airtable `Feedback` table into the applicant drawer, providing a comprehensive view of all interview-related documents and notes.

## Features

### ✅ **Smart Document Extraction**
- Automatically extracts documents from three key attachment fields:
  - **First Interview Questions** → "First Interview Notes"
  - **Second Interview Questions** → "Second Interview Notes" 
  - **Docs - After Second Interview** → "After Second Interview Notes"

### ✅ **Intelligent Caching**
- **Client-side caching**: 5-minute localStorage cache for instant loading
- **Server-side caching**: 5-minute HTTP cache headers
- **Smart revalidation**: Only fetches when feedback tab is active

### ✅ **Clean UI Display**
- **Short document titles**: "First Interview Notes - 25/12/2024"
- **Compact layout**: Only shows document title with date, no extra metadata
- **Grouped by stage**: Documents organized by interview stage
- **Clean interface**: Minimal information to prevent section stretching

### ✅ **Performance Optimized**
- **Conditional loading**: Only loads when feedback tab is active
- **Rules of Hooks compliant**: No conditional hook calls
- **Efficient SWR usage**: Proper deduplication and error handling
- **File proxy**: Secure file access through authenticated proxy endpoint

## API Endpoints

### `GET /api/admin/users/[id]/feedback-documents`

**Purpose**: Fetch feedback documents for a specific applicant

**Authentication**: Requires admin session (`session.userRole === 'admin'`)

**Response**:
```json
{
  "success": true,
  "data": {
    "applicantId": "rec123...",
    "applicantName": "John Doe",
    "documents": [
      {
        "id": "rec456-first-0",
        "feedbackId": "rec456",
        "documentType": "First Interview Notes",
        "interviewStage": "First Interview",
        "fileName": "interview_questions.pdf",
        "fileUrl": "https://...",
        "fileSize": 1024000,
        "fileType": "application/pdf",
        "uploadedAt": "2024-12-25T10:30:00Z",
        "interviewer": "Jane Smith",
        "rating": 4
      }
    ],
    "documentsByStage": {
      "First Interview": [...],
      "Second Interview": [...]
    },
    "documentsByType": {
      "First Interview Notes": [...],
      "Second Interview Notes": [...]
    },
    "stats": {
      "total": 3,
      "byStage": { "First Interview": 1, "Second Interview": 2 },
      "byType": { "First Interview Notes": 1, "Second Interview Notes": 2 }
    }
  }
}
```

### `GET /api/admin/users/[id]/debug-feedback`

**Purpose**: Debug endpoint for troubleshooting feedback document extraction

**Response**: Comprehensive debug information including field mappings and extraction details

### `GET /api/admin/files/proxy`

**Purpose**: Proxy endpoint for secure file access from Airtable

**Authentication**: Requires admin session (`session.userRole === 'admin'`)

**Parameters**: `url` - The Airtable file URL to proxy

**Response**: File content with appropriate headers for preview/download

## React Hook

### `useFeedbackDocuments(applicantId, options)`

**Parameters**:
- `applicantId`: The applicant's record ID
- `options`: Configuration object
  - `enabled`: Whether to fetch data (default: true)
  - `refreshInterval`: Auto-refresh interval in ms (default: 30000)
  - `revalidateOnFocus`: Revalidate when window gains focus (default: true)
  - `revalidateOnReconnect`: Revalidate when network reconnects (default: true)
  - `onSuccess`: Success callback
  - `onError`: Error callback

**Returns**:
```javascript
{
  // Data
  documents: Document[],
  documentsByStage: Record<string, Document[]>,
  documentsByType: Record<string, Document[]>,
  stats: { total: number, byStage: Record<string, number>, byType: Record<string, number> },
  applicantName: string,
  
  // Loading states
  isLoading: boolean,
  isValidating: boolean,
  isRefreshing: boolean,
  
  // Error state
  error: Error | null,
  
  // Actions
  refresh: () => Promise<void>,
  mutate: () => Promise<void>,
  
  // Helper functions
  groupByStage: (documents: Document[]) => Record<string, Document[]>,
  groupByType: (documents: Document[]) => Record<string, Document[]>,
  getDocumentsByStage: (stage: string) => Document[],
  getDocumentsByType: (type: string) => Document[],
  getFeedbackStats: () => Stats,
  
  // Metadata
  lastRefreshTime: Date | null,
  hasData: boolean,
  totalDocuments: number,
  
  // Cache info
  isFromCache: boolean,
  cacheKey: string | null
}
```

## UI Components

### Feedback Tab in Applicant Drawer

The feedback tab displays:

1. **Upload Section**: Dropzone for submitting new feedback files
2. **Feedback Documents Section**: 
   - Documents grouped by interview stage
   - Clean titles: "First Interview Notes - 25/12/2024"
   - Compact layout with minimal information
   - View button to open documents
3. **Legacy Files Section**: Backward compatibility for old feedback files
4. **Cache Indicator**: Shows when displaying cached data

## Technical Implementation

### Data Flow

1. **User opens feedback tab** → Hook enabled
2. **Hook checks cache** → Returns cached data if available
3. **API call made** → Fetches from Airtable Feedback table
4. **Documents extracted** → From attachment fields
5. **Data cached** → Both client and server side
6. **UI updated** → Clean display with dates and metadata

### Caching Strategy

- **Client Cache**: localStorage with 5-minute TTL
- **Server Cache**: HTTP Cache-Control headers
- **SWR Cache**: Built-in deduplication and revalidation
- **Smart Loading**: Only when tab is active

### Error Handling

- **Authentication errors**: 401/403 responses
- **Network errors**: Retry with exponential backoff
- **Data errors**: Graceful fallback with error messages
- **Cache errors**: Fallback to fresh data

## Usage Examples

### Basic Usage
```javascript
const { documents, isLoading, error } = useFeedbackDocuments(applicantId)
```

### With Custom Options
```javascript
const { documents, refresh } = useFeedbackDocuments(applicantId, {
  enabled: tab === "feedback",
  refreshInterval: 60000,
  onSuccess: (data) => console.log('Loaded:', data),
  onError: (error) => console.error('Error:', error)
})
```

### Manual Refresh
```javascript
const { refresh, isRefreshing } = useFeedbackDocuments(applicantId)

// Trigger manual refresh
await refresh()
```

## Troubleshooting

### Common Issues

1. **403 Forbidden**: Check admin session and permissions
2. **No documents showing**: Verify Airtable field names and data
3. **Cache issues**: Clear localStorage or wait for cache expiry
4. **Performance issues**: Check if hook is enabled when not needed

### Debug Endpoint

Use `/api/admin/users/[id]/debug-feedback` to:
- View all available fields in feedback records
- Check field name mappings
- Verify document extraction logic
- Troubleshoot data issues

## Future Enhancements

- [ ] Real-time updates via WebSocket
- [ ] Document preview in modal
- [ ] Bulk document operations
- [ ] Advanced filtering and search
- [ ] Document versioning support
