# Custom Pre-Appraisal Questions Feature

## Overview

This feature enables admins to customize pre-appraisal questions for employees. Questions can be edited per-applicant with the option to inherit defaults from job-level templates. When an appraisal is created, the current questions are snapshotted into the appraisal history for future reference.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Applicant Drawer UI                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Set Date Btn │  │ Settings Btn │  │ Eye Icon (per entry) │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                      │              │
│         ▼                 ▼                      ▼              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Date Picker  │  │  Template    │  │  Questions Viewer    │  │
│  │    Modal     │  │   Editor     │  │     (Read-Only)      │  │
│  └──────┬───────┘  └──────────────┘  └──────────────────────┘  │
│         │                                                       │
│         ▼                                                       │
│  ┌──────────────┐                                               │
│  │  Question    │                                               │
│  │   Editor     │                                               │
│  └──────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API Layer                               │
│  ┌────────────────────────┐  ┌─────────────────────────────┐   │
│  │ /appraisal-questions   │  │ /appraisal-template         │   │
│  │ GET: Get effective     │  │ GET: Get job template       │   │
│  │ POST: Save override    │  │ POST: Save job template     │   │
│  │ DELETE: Clear override │  └─────────────────────────────┘   │
│  └────────────────────────┘                                     │
│  ┌────────────────────────┐                                     │
│  │ /appraisal-date        │                                     │
│  │ POST: Set date +       │                                     │
│  │       snapshot         │                                     │
│  └────────────────────────┘                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Airtable                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Applicants Table                                        │   │
│  │  - Preappraisal Questions Override (JSON)               │   │
│  │  - Preappraisal Questions Template (lookup from Jobs)   │   │
│  │  - Preappraisal Questions Effective (formula)           │   │
│  │  - Appraisal History (includes question snapshots)      │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Jobs Table                                              │   │
│  │  - Preappraisal Questions Template (JSON)               │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Airtable Fields

### Applicants Table

| Field Name | Field ID | Type | Purpose |
|------------|----------|------|---------|
| Preappraisal Questions Override (JSON) | `fldCmnvIXn1o2nDrx` | Multiline Text | Per-applicant customized questions |
| Preappraisal Questions Template (JSON) | `fldKEzzV1vNhteARD` | Lookup | Read-only lookup from linked Jobs table |
| Preappraisal Questions Effective (JSON) | `fldHKo0Qwki2hba7K` | Formula | Returns Override if present, else Template |
| Appraisal History | existing | Multiline Text | JSON with appraisal entries (now includes `preappraisalQuestions` snapshots) |

### Jobs Table

| Field Name | Field ID | Type | Purpose |
|------------|----------|------|---------|
| Preappraisal Questions Template (JSON) | `fldWdgCRTKzRJBPXI` | Multiline Text | Default questions for the role |

## JSON Structure

All question data follows this exact structure:

```json
{
  "version": 1,
  "type": "preappraisal",
  "roleKey": "nurse",
  "updatedAt": "2026-01-19T12:00:00.000Z",
  "questions": [
    { "order": 1, "text": "Reflect on your main duties and responsibilities over the last year..." },
    { "order": 2, "text": "Outline your notable achievements in the last year..." }
  ]
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `version` | number | Always `1` - for future schema migrations |
| `type` | string | Always `"preappraisal"` |
| `roleKey` | string | Slug identifier for the role (e.g., "nurse", "dental-receptionist") |
| `updatedAt` | ISO datetime | When the questions were last modified |
| `questions` | array | Ordered list of questions |
| `questions[].order` | number | Sequential order (1..N) |
| `questions[].text` | string | The question text |

## API Endpoints

### GET /api/admin/users/[id]/appraisal-questions

Returns the effective (resolved) questions for an applicant.

**Response:**
```json
{
  "success": true,
  "source": "override" | "template" | "empty",
  "hasOverride": true,
  "questions": { /* JSON structure */ }
}
```

### POST /api/admin/users/[id]/appraisal-questions

Save applicant override questions.

**Request Body:**
```json
{
  "questions": [
    { "order": 1, "text": "Question 1..." },
    { "order": 2, "text": "Question 2..." }
  ],
  "roleKey": "nurse" // optional
}
```

Or full structure:
```json
{
  "version": 1,
  "type": "preappraisal",
  "roleKey": "nurse",
  "questions": [...]
}
```

### DELETE /api/admin/users/[id]/appraisal-questions

Clear the applicant override, reverting to the job template.

### GET /api/admin/users/[id]/appraisal-template

Get the job template questions for the applicant's linked job.

**Response:**
```json
{
  "success": true,
  "hasJob": true,
  "jobId": "recXXX",
  "jobName": "Dental Nurse",
  "template": { /* JSON structure */ }
}
```

### POST /api/admin/users/[id]/appraisal-template

Save job template questions (updates the linked job's template).

**Request Body:**
```json
{
  "questions": [
    { "order": 1, "text": "Question 1..." }
  ]
}
```

### POST /api/admin/users/[id]/appraisal-date

Set appraisal date (existing endpoint, now also stores question snapshot).

The endpoint now reads the current override questions and stores them in the appraisal history entry as `preappraisalQuestions`.

## UI Components

### AppraisalQuestionEditor

A modal component for editing questions with the following features:

- List questions with order numbers
- Edit question text inline (textarea)
- Add new questions
- Delete questions (with confirmation)
- Reorder questions (Up/Down buttons)
- Reset to Template (override mode only)
- Save/Cancel buttons
- Loading and error states

**Location:** `components/admin/users/AppraisalQuestionEditor.js`

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `open` | boolean | Whether modal is open |
| `onOpenChange` | function | Open state callback |
| `questions` | array | Initial questions array |
| `roleKey` | string | Role identifier for display |
| `isTemplate` | boolean | If true, editing job template |
| `onSave` | async function | Save callback with questions array |
| `onReset` | async function | Reset to template callback |
| `loading` | boolean | External loading state |
| `error` | string | External error message |

### AppraisalQuestionsViewer

A read-only modal for viewing questions from appraisal history.

**Location:** `components/admin/users/AppraisalQuestionsViewer.js`

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `open` | boolean | Whether modal is open |
| `onOpenChange` | function | Open state callback |
| `questions` | object | Questions JSON object from history |
| `appraisalDate` | string | ISO date string |
| `year` | number/string | Appraisal year |

## User Flow

### Creating a New Appraisal

1. Admin clicks "Set Date" button in Appraisals section
2. Selects date and time using the calendar picker
3. Clicks "Continue" to confirm
4. System:
   - Saves the appraisal date
   - Creates calendar appointment
   - Fetches job template questions
   - Copies template to applicant override
   - Opens question editor modal
5. Admin customizes questions (add, edit, delete, reorder)
6. Clicks "Save Questions"
7. System:
   - Saves override questions
   - Updates appraisal history with question snapshot
   - Closes all modals

### Viewing Past Appraisal Questions

1. Admin finds appraisal entry in the list
2. Clicks the Eye icon button
3. Modal opens showing:
   - Appraisal date
   - All questions in order
   - Role key

### Editing Job Template

1. Admin clicks the Settings (cog) icon next to "Set Date"
2. Template editor modal opens with current job questions
3. Admin edits questions
4. Clicks "Save Template"
5. Changes apply to future appraisals only (existing overrides unchanged)

## Integration with Make.com

The Make.com scenario reads questions from Airtable when triggered:

1. **Override Present**: Uses `Preappraisal Questions Override (JSON)` field
2. **No Override**: Uses lookup from Jobs table via `Preappraisal Questions Template (JSON)`
3. **Effective Field**: Can also use `Preappraisal Questions Effective (JSON)` formula field which automatically resolves to the correct source

### Document Generation

Make.com can use the questions JSON to generate Word documents:

```
Questions from Airtable:
{{1.`Preappraisal Questions Effective (JSON)`}}

Parse JSON in Make.com, then iterate questions array to populate document.
```

## Files Created/Modified

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/utils/appraisal-questions.js` | Created | JSON utilities for validation and normalization |
| `src/app/api/admin/users/[id]/appraisal-questions/route.js` | Created | CRUD API for applicant override |
| `src/app/api/admin/users/[id]/appraisal-template/route.js` | Created | CRUD API for job template |
| `src/app/api/admin/users/[id]/appraisal-date/route.js` | Modified | Added question snapshot to history |
| `components/admin/users/AppraisalQuestionEditor.js` | Created | Question editor modal |
| `components/admin/users/AppraisalQuestionsViewer.js` | Created | Read-only viewer modal |
| `components/admin/users/applicant-drawer.js` | Modified | Integrated new UI components |

## Utility Functions

Located in `src/lib/utils/appraisal-questions.js`:

| Function | Description |
|----------|-------------|
| `normalizeQuestions(questions)` | Sort by order, renumber 1..N, remove empty |
| `validateQuestionsJSON(input)` | Parse and validate JSON structure |
| `createEmptyQuestionsJSON(roleKey)` | Create valid empty structure |
| `createQuestionsJSON(roleKey, questions)` | Create full structure from questions array |
| `copyTemplateToOverride(template)` | Deep copy with fresh updatedAt |
| `parseAirtableQuestionsField(value)` | Handle Airtable field formats (lookup arrays) |
| `generateRoleKey(jobName)` | Generate slug from job name |

## Error Handling

The implementation includes comprehensive error handling:

- **JSON Parse Failures**: Shows user-friendly error with Reset to Template option
- **Missing Template**: Initializes empty structure, shows warning banner
- **API Failures**: Toast errors, preserves local state for retry
- **Invalid Questions**: Auto-removes empty questions, shows warning
- **Missing Job Link**: Gracefully handles applicants without linked jobs

## Security

All endpoints require:
- Valid session cookie
- Admin role verification

Audit logging is performed through existing `logAuditEvent` function.
