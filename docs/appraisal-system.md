# Appraisal System

## Overview

Admins can manage pre-appraisal questions per applicant, customize them from job-level templates, and upload appraisal documents. When an appraisal date is set, the active questions are snapshotted into the appraisal history for future reference.

## Architecture

```
Jobs Table                Applicants Table               Applicants Table
(Template)      Copy      (Override)        Snapshot     (Appraisal History)
fldWdgCRTKzRJBPXI ──────▶ fldCmnvIXn1o2nDrx ──────────▶ Appraisal History
```

- **Template** (Jobs table): Default questions for a role
- **Override** (Applicants table): Per-applicant customized questions
- **Effective** (Applicants table): Airtable formula — returns Override if present, else Template
- **History** (Applicants table): JSON with all appraisals, each containing a snapshot of questions at the time

## Airtable Fields

### Applicants Table

| Field | Field ID | Type | Purpose |
|-------|----------|------|---------|
| Preappraisal Questions Override (JSON) | `fldCmnvIXn1o2nDrx` | Multiline Text | Per-applicant questions |
| Preappraisal Questions Template (JSON) | `fldKEzzV1vNhteARD` | Lookup | Read-only from linked Jobs |
| Preappraisal Questions Effective (JSON) | `fldHKo0Qwki2hba7K` | Formula | Override ?? Template |
| Appraisal Doc | — | Attachments | Uploaded appraisal documents |
| Appraisal History | `fldrnRVH15LptSFzV` | Multiline Text | JSON history with question snapshots |
| Appraisal Date | `fldub0zVNjd0Skkly` | DateTime | Current/next appraisal date |

### Jobs Table

| Field | Field ID | Type | Purpose |
|-------|----------|------|---------|
| Preappraisal Questions Template (JSON) | `fldWdgCRTKzRJBPXI` | Multiline Text | Default questions for the role |

## JSON Structure

All question data follows this structure:

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

## API Endpoints

### Applicant override questions

```
GET    /api/admin/users/[id]/appraisal-questions   → effective questions + source
POST   /api/admin/users/[id]/appraisal-questions   → save override
DELETE /api/admin/users/[id]/appraisal-questions   → clear override (revert to template)
```

**GET response:**
```json
{
  "success": true,
  "source": "override",    // "override" | "template" | "empty"
  "hasOverride": true,
  "questions": { /* JSON structure */ }
}
```

**POST body:**
```json
{
  "questions": [{ "order": 1, "text": "Question 1..." }],
  "roleKey": "nurse"
}
```

### Job template questions

```
GET  /api/admin/users/[id]/appraisal-template   → job template for applicant's linked job
POST /api/admin/users/[id]/appraisal-template   → save job template
```

### Set appraisal date (with question snapshot)

```
POST /api/admin/users/[id]/appraisal-date
Body: { "date": "YYYY-MM-DD", ... }
```

On save, reads the current override questions and stores them as `preappraisalQuestions` in the appraisal history entry.

### Upload appraisal document

```
POST /api/admin/users/[id]/appraisal
Body: multipart/form-data with files[]
```

Uploads files to the `Appraisal Doc` attachment field on the Applicants record. Files are appended to the existing list. Supported up to ~10–15 MB per file.

## User Flow

### Creating a New Appraisal
1. Admin clicks "Set Date" in the Appraisals section → selects date/time → confirms
2. System saves the date, creates a Google Calendar appointment, copies the job template to the applicant override, and opens the question editor
3. Admin customizes questions (add, edit, delete, reorder) → "Save Questions"
4. System saves the override and records the snapshot in appraisal history

### Viewing Past Appraisal Questions
1. Find the appraisal entry → click the Eye icon
2. Modal shows the date and all questions as they were at the time of that appraisal

### Editing a Job Template
1. Click the Settings (cog) icon next to "Set Date"
2. Edit template questions → "Save Template"
3. Changes apply to **future** appraisals only; existing overrides are unaffected

## UI Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `AppraisalQuestionEditor` | `components/admin/users/AppraisalQuestionEditor.js` | Edit/reorder questions modal |
| `AppraisalQuestionsViewer` | `components/admin/users/AppraisalQuestionsViewer.js` | Read-only history viewer |
| `applicant-drawer.js` | `components/admin/users/applicant-drawer.js` | Host UI (Documents tab, Appraisals section) |

## Make.com Integration

When Make.com scenarios need the questions:

- **Override present**: Use `Preappraisal Questions Override (JSON)` field
- **No override**: Use the lookup via `Preappraisal Questions Template (JSON)`
- **Easiest**: Use `Preappraisal Questions Effective (JSON)` formula field — it resolves automatically

```
Questions from Airtable:
{{1.`Preappraisal Questions Effective (JSON)`}}
Parse JSON in Make.com, then iterate the questions array to populate the document.
```

## Utility Functions (`src/lib/utils/appraisal-questions.js`)

| Function | Description |
|----------|-------------|
| `normalizeQuestions(questions)` | Sort by order, renumber 1..N, remove empty |
| `validateQuestionsJSON(input)` | Parse and validate JSON structure |
| `createEmptyQuestionsJSON(roleKey)` | Create valid empty structure |
| `createQuestionsJSON(roleKey, questions)` | Build full structure from questions array |
| `copyTemplateToOverride(template)` | Deep copy with fresh `updatedAt` |
| `parseAirtableQuestionsField(value)` | Handle Airtable lookup array formats |
| `generateRoleKey(jobName)` | Generate slug from job name |
