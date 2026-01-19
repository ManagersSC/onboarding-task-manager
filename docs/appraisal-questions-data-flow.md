# Appraisal Questions Data Flow

This document details the data flow between Next.js and Airtable for the appraisal questions feature.

---

## Table of Contents

1. [Overview](#overview)
2. [Airtable Fields Reference](#airtable-fields-reference)
3. [JSON Structure Contract](#json-structure-contract)
4. [Flow 1: Setting a New Appraisal Date](#flow-1-setting-a-new-appraisal-date)
5. [Flow 2: Viewing Past Appraisal Questions (Eye Icon)](#flow-2-viewing-past-appraisal-questions-eye-icon)
6. [Flow 3: Editing Job Template (Cog Icon)](#flow-3-editing-job-template-cog-icon)
7. [Complete System Diagram](#complete-system-diagram)

---

## Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           APPRAISAL QUESTIONS SYSTEM                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐         ┌─────────────┐         ┌─────────────────────┐  │
│   │   JOBS      │         │ APPLICANTS  │         │   APPLICANTS        │  │
│   │   TABLE     │         │   TABLE     │         │   TABLE             │  │
│   ├─────────────┤         ├─────────────┤         ├─────────────────────┤  │
│   │ Template    │ ──────▶ │ Override    │ ──────▶ │ Appraisal History   │  │
│   │ (Master)    │  Copy   │ (Per-User)  │ Snapshot│ (Historical Record) │  │
│   └─────────────┘         └─────────────┘         └─────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Airtable Fields Reference

| Field Name | Field ID | Table | Purpose |
|------------|----------|-------|---------|
| Preappraisal Questions Template (JSON) | `fldWdgCRTKzRJBPXI` | **Jobs** | Master questions for a role |
| Preappraisal Questions Override (JSON) | `fldCmnvIXn1o2nDrx` | **Applicants** | Customized questions for this applicant |
| Preappraisal Questions Effective (JSON) | `fldHKo0Qwki2hba7K` | **Applicants** | Formula: Override if exists, else Template |
| Appraisal History | `fldrnRVH15LptSFzV` | **Applicants** | JSON with all appraisals + question snapshots |
| Appraisal Date | `fldub0zVNjd0Skkly` | **Applicants** | Current/next appraisal date |
| Applying For | `fld2kd9SxfdltFVwW` | **Applicants** | Link to Jobs table |
| Title | `fldTvEi44E8tSTsWL` | **Jobs** | Job name (used for roleKey) |

---

## JSON Structure Contract

### Questions JSON Structure (Used in Template, Override, and History Snapshot)

```json
{
  "version": 1,
  "type": "preappraisal",
  "roleKey": "nurse",
  "updatedAt": "2026-01-19T12:00:00.000Z",
  "questions": [
    { "order": 1, "text": "Reflect on your main duties..." },
    { "order": 2, "text": "Outline your notable achievements..." },
    { "order": 3, "text": "What are you particularly proud of..." }
  ]
}
```

### Appraisal History JSON Structure

```json
{
  "appraisals": [
    {
      "year": 2025,
      "appraisalDate": "2025-12-03T09:00:00.000Z",
      "steps": [
        { "id": "set_appraisal_date", "label": "Set Appraisal Date", "completedAt": "2025-12-02T11:19:32.752Z" },
        { "id": "sent_pre_appraisal_form", "label": "Send Pre-Appraisal Form", "completedAt": null },
        { "id": "sent_finalised_action_plan", "label": "Send Finalised Action Plan", "completedAt": null }
      ],
      "preappraisalQuestions": {
        "version": 1,
        "type": "preappraisal",
        "roleKey": "nurse",
        "updatedAt": "2025-12-02T11:19:32.752Z",
        "questions": [
          { "order": 1, "text": "Reflect on your main duties..." },
          { "order": 2, "text": "Outline your notable achievements..." }
        ]
      },
      "createdAt": "2025-12-02T11:19:32.752Z",
      "updatedAt": "2025-12-02T11:19:32.752Z"
    }
  ]
}
```

---

## Flow 1: Setting a New Appraisal Date

### Sequence Diagram

```
┌──────────┐          ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│   USER   │          │   NEXT.JS    │          │   AIRTABLE   │          │   AIRTABLE   │
│          │          │   FRONTEND   │          │  APPLICANTS  │          │    JOBS      │
└────┬─────┘          └──────┬───────┘          └──────┬───────┘          └──────┬───────┘
     │                       │                         │                         │
     │  1. Click "Set Date"  │                         │                         │
     │──────────────────────▶│                         │                         │
     │                       │                         │                         │
     │  2. Select date/time  │                         │                         │
     │──────────────────────▶│                         │                         │
     │                       │                         │                         │
     │  3. Click "Continue"  │                         │                         │
     │──────────────────────▶│                         │                         │
     │                       │                         │                         │
     │                       │  4. GET /appraisal-template                       │
     │                       │─────────────────────────┼────────────────────────▶│
     │                       │                         │                         │
     │                       │  5. Return template JSON                          │
     │                       │◀────────────────────────┼─────────────────────────│
     │                       │                         │                         │
     │  6. Show Question     │                         │                         │
     │     Editor Modal      │                         │                         │
     │◀──────────────────────│                         │                         │
     │                       │                         │                         │
     │  7. Edit questions    │                         │                         │
     │     (optional)        │                         │                         │
     │──────────────────────▶│                         │                         │
     │                       │                         │                         │
     │  8. Click "Confirm"   │                         │                         │
     │──────────────────────▶│                         │                         │
     │                       │                         │                         │
     │                       │  9. POST /appraisal-date                          │
     │                       │────────────────────────▶│                         │
     │                       │                         │                         │
     │                       │  10. Update fields      │                         │
     │                       │      - Appraisal Date   │                         │
     │                       │      - Appraisal History│                         │
     │                       │      - Override (JSON)  │                         │
     │                       │◀────────────────────────│                         │
     │                       │                         │                         │
     │  11. Success toast    │                         │                         │
     │◀──────────────────────│                         │                         │
     │                       │                         │                         │
```

### Step-by-Step Details

---

#### Step 4: GET Template from Jobs Table

**API Endpoint:** `GET /api/admin/users/[id]/appraisal-template`

**Request:**
```
GET /api/admin/users/rec123abc/appraisal-template
Headers: { Cookie: session=... }
```

**Airtable Query 1 - Get Applicant's Linked Job:**
```javascript
base("Applicants").select({
  filterByFormula: `RECORD_ID() = 'rec123abc'`,
  fields: ["fld2kd9SxfdltFVwW"]  // Applying For
})
```

**Airtable Query 2 - Get Job Template:**
```javascript
base("Jobs").select({
  filterByFormula: `RECORD_ID() = 'recJobXYZ'`,
  fields: ["fldTvEi44E8tSTsWL", "fldWdgCRTKzRJBPXI"]  // Title, Template JSON
})
```

**Response to Frontend:**
```json
{
  "success": true,
  "hasJob": true,
  "jobId": "recJobXYZ",
  "jobName": "Dental Nurse",
  "template": {
    "version": 1,
    "type": "preappraisal",
    "roleKey": "dental-nurse",
    "updatedAt": "2026-01-10T10:00:00.000Z",
    "questions": [
      { "order": 1, "text": "Reflect on your main duties..." },
      { "order": 2, "text": "Outline your notable achievements..." },
      { "order": 3, "text": "What are you particularly proud of..." }
    ]
  }
}
```

---

#### Step 9: POST Appraisal Date + Questions Snapshot

**API Endpoint:** `POST /api/admin/users/[id]/appraisal-date`

**Request Body:**
```json
{
  "appraisalDate": "2026-02-15T09:00:00.000Z",
  "preappraisalQuestions": {
    "version": 1,
    "type": "preappraisal",
    "roleKey": "dental-nurse",
    "updatedAt": "2026-01-19T14:30:00.000Z",
    "questions": [
      { "order": 1, "text": "Reflect on your main duties..." },
      { "order": 2, "text": "Custom question added by admin..." }
    ]
  }
}
```

**Airtable Update:**
```javascript
base("Applicants").update([{
  id: "rec123abc",
  fields: {
    "fldub0zVNjd0Skkly": "2026-02-15",                    // Appraisal Date
    "fldrnRVH15LptSFzV": JSON.stringify(newHistoryObj),   // Appraisal History
    "fldCmnvIXn1o2nDrx": JSON.stringify(questionsJSON)    // Override JSON
  }
}])
```

**New Appraisal History Entry (added to existing array):**
```json
{
  "year": 2026,
  "appraisalDate": "2026-02-15T09:00:00.000Z",
  "steps": [
    { "id": "set_appraisal_date", "label": "Set Appraisal Date", "completedAt": "2026-01-19T14:30:00.000Z" },
    { "id": "sent_pre_appraisal_form", "label": "Send Pre-Appraisal Form", "completedAt": null },
    { "id": "sent_finalised_action_plan", "label": "Send Finalised Action Plan", "completedAt": null }
  ],
  "preappraisalQuestions": {
    "version": 1,
    "type": "preappraisal",
    "roleKey": "dental-nurse",
    "updatedAt": "2026-01-19T14:30:00.000Z",
    "questions": [
      { "order": 1, "text": "Reflect on your main duties..." },
      { "order": 2, "text": "Custom question added by admin..." }
    ]
  },
  "createdAt": "2026-01-19T14:30:00.000Z",
  "updatedAt": "2026-01-19T14:30:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "appraisalDate": "2026-02-15T09:00:00.000Z",
  "year": 2026
}
```

---

## Flow 2: Viewing Past Appraisal Questions (Eye Icon)

### Sequence Diagram

```
┌──────────┐          ┌──────────────┐          ┌──────────────┐
│   USER   │          │   NEXT.JS    │          │   AIRTABLE   │
│          │          │   FRONTEND   │          │  APPLICANTS  │
└────┬─────┘          └──────┬───────┘          └──────┬───────┘
     │                       │                         │
     │                       │  (Already loaded on     │
     │                       │   drawer open via SWR)  │
     │                       │◀────────────────────────│
     │                       │                         │
     │  1. Click Eye icon    │                         │
     │     on appraisal row  │                         │
     │──────────────────────▶│                         │
     │                       │                         │
     │  2. Read from memory: │                         │
     │     appraisalHistory  │                         │
     │     .appraisals[x]    │                         │
     │     .preappraisalQuestions                      │
     │                       │                         │
     │  3. Show viewer modal │                         │
     │◀──────────────────────│                         │
     │                       │                         │
```

### Data Source

**No API call required** - Data is already loaded when the drawer opens.

**Data Path:**
```
Applicant Record
  └── Appraisal History (fldrnRVH15LptSFzV)
        └── appraisals[]
              └── preappraisalQuestions (snapshot)
```

**Frontend Code:**
```javascript
// When eye icon clicked
setAppraisalViewerData({
  questions: appraisal.preappraisalQuestions,  // From history snapshot
  appraisalDate: appraisal.appraisalDate,
  year: appraisal.year
})
setAppraisalViewerOpen(true)
```

**Modal Displays:**
```json
{
  "questions": {
    "version": 1,
    "type": "preappraisal",
    "roleKey": "dental-nurse",
    "updatedAt": "2026-01-19T14:30:00.000Z",
    "questions": [
      { "order": 1, "text": "Reflect on your main duties..." },
      { "order": 2, "text": "Custom question added by admin..." }
    ]
  },
  "appraisalDate": "2026-02-15T09:00:00.000Z",
  "year": 2026
}
```

---

## Flow 3: Editing Job Template (Cog Icon)

### Sequence Diagram

```
┌──────────┐          ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│   USER   │          │   NEXT.JS    │          │   AIRTABLE   │          │   AIRTABLE   │
│          │          │   FRONTEND   │          │  APPLICANTS  │          │    JOBS      │
└────┬─────┘          └──────┬───────┘          └──────┬───────┘          └──────┬───────┘
     │                       │                         │                         │
     │  1. Click Cog icon    │                         │                         │
     │──────────────────────▶│                         │                         │
     │                       │                         │                         │
     │                       │  2. GET /appraisal-template                       │
     │                       │────────────────────────▶│                         │
     │                       │                         │                         │
     │                       │  3. Get linked job ID   │                         │
     │                       │◀────────────────────────│                         │
     │                       │                         │                         │
     │                       │  4. GET template from Jobs                        │
     │                       │─────────────────────────┼────────────────────────▶│
     │                       │                         │                         │
     │                       │  5. Return template     │                         │
     │                       │◀────────────────────────┼─────────────────────────│
     │                       │                         │                         │
     │  6. Show Template     │                         │                         │
     │     Editor Modal      │                         │                         │
     │◀──────────────────────│                         │                         │
     │                       │                         │                         │
     │  7. Edit questions    │                         │                         │
     │──────────────────────▶│                         │                         │
     │                       │                         │                         │
     │  8. Click "Save       │                         │                         │
     │     Template"         │                         │                         │
     │──────────────────────▶│                         │                         │
     │                       │                         │                         │
     │                       │  9. POST /appraisal-template                      │
     │                       │─────────────────────────┼────────────────────────▶│
     │                       │                         │                         │
     │                       │  10. Update Jobs table  │                         │
     │                       │◀────────────────────────┼─────────────────────────│
     │                       │                         │                         │
     │  11. Success toast    │                         │                         │
     │◀──────────────────────│                         │                         │
     │                       │                         │                         │
```

### Step-by-Step Details

---

#### Step 2-5: GET Template

Same as Flow 1, Step 4.

---

#### Step 9: POST Updated Template

**API Endpoint:** `POST /api/admin/users/[id]/appraisal-template`

**Request Body:**
```json
{
  "questions": [
    { "order": 1, "text": "Reflect on your main duties..." },
    { "order": 2, "text": "Outline your notable achievements..." },
    { "order": 3, "text": "NEW: What challenges did you face..." }
  ]
}
```

**Airtable Update (Jobs Table):**
```javascript
base("Jobs").update([{
  id: "recJobXYZ",
  fields: {
    "fldWdgCRTKzRJBPXI": JSON.stringify({
      version: 1,
      type: "preappraisal",
      roleKey: "dental-nurse",
      updatedAt: "2026-01-19T15:00:00.000Z",
      questions: [
        { order: 1, text: "Reflect on your main duties..." },
        { order: 2, text: "Outline your notable achievements..." },
        { order: 3, text: "NEW: What challenges did you face..." }
      ]
    })
  }
}])
```

**Response:**
```json
{
  "success": true,
  "jobId": "recJobXYZ",
  "jobName": "Dental Nurse",
  "template": {
    "version": 1,
    "type": "preappraisal",
    "roleKey": "dental-nurse",
    "updatedAt": "2026-01-19T15:00:00.000Z",
    "questions": [
      { "order": 1, "text": "Reflect on your main duties..." },
      { "order": 2, "text": "Outline your notable achievements..." },
      { "order": 3, "text": "NEW: What challenges did you face..." }
    ]
  }
}
```

---

## Complete System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    APPRAISAL QUESTIONS ARCHITECTURE                             │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

                                        ┌─────────────────────┐
                                        │       USER          │
                                        │   (Admin Portal)    │
                                        └──────────┬──────────┘
                                                   │
                    ┌──────────────────────────────┼──────────────────────────────┐
                    │                              │                              │
                    ▼                              ▼                              ▼
         ┌─────────────────────┐       ┌─────────────────────┐       ┌─────────────────────┐
         │    "Set Date"       │       │    Eye Icon         │       │    Cog Icon         │
         │    Button           │       │    (View History)   │       │    (Edit Template)  │
         └──────────┬──────────┘       └──────────┬──────────┘       └──────────┬──────────┘
                    │                              │                              │
                    ▼                              │                              ▼
┌───────────────────────────────────┐              │          ┌───────────────────────────────────┐
│  AppraisalDateSetter Component    │              │          │  AppraisalQuestionEditor          │
│  ┌─────────────────────────────┐  │              │          │  (isTemplate=true)                │
│  │ Step 1: Date Picker Modal   │  │              │          │  ┌─────────────────────────────┐  │
│  └──────────────┬──────────────┘  │              │          │  │ Edit/Add/Delete/Reorder    │  │
│                 ▼                  │              │          │  │ questions                   │  │
│  ┌─────────────────────────────┐  │              │          │  └──────────────┬──────────────┘  │
│  │ Step 2: Question Editor     │  │              │          └─────────────────┼─────────────────┘
│  │ (Copy template → Override)  │  │              │                            │
│  └──────────────┬──────────────┘  │              │                            │
└─────────────────┼─────────────────┘              │                            │
                  │                                │                            │
                  ▼                                ▼                            ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                      NEXT.JS API ROUTES                                         │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                 │
│   /api/admin/users/[id]/appraisal-date         (POST)                                          │
│   ├── Writes: Appraisal Date                                                                   │
│   ├── Writes: Appraisal History (with questions snapshot)                                      │
│   └── Writes: Override JSON                                                                    │
│                                                                                                 │
│   /api/admin/users/[id]/appraisal-template     (GET/POST)                                      │
│   ├── Reads: Applicant's linked Job                                                            │
│   ├── Reads: Job's Template JSON                                                               │
│   └── Writes: Job's Template JSON                                                              │
│                                                                                                 │
│   /api/admin/users/[id]/appraisal-questions    (GET/POST/DELETE)                               │
│   ├── Reads: Effective JSON (Override or Template)                                             │
│   └── Writes: Override JSON                                                                    │
│                                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
                  │                                │                            │
                  ▼                                ▼                            ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                        AIRTABLE DATABASE                                        │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────┐  │
│   │                              APPLICANTS TABLE                                            │  │
│   ├─────────────────────────────────────────────────────────────────────────────────────────┤  │
│   │                                                                                         │  │
│   │   fld2kd9SxfdltFVwW  │  "Applying For"                    │  Link to Jobs              │  │
│   │   fldub0zVNjd0Skkly  │  "Appraisal Date"                  │  Date field                │  │
│   │   fldrnRVH15LptSFzV  │  "Appraisal History"               │  JSON (all appraisals)     │  │
│   │   fldCmnvIXn1o2nDrx  │  "Preappraisal Questions Override" │  JSON (per-applicant)      │  │
│   │   fldHKo0Qwki2hba7K  │  "Preappraisal Questions Effective"│  Formula (Override|Template)│  │
│   │                                                                                         │  │
│   └─────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                              │                                                  │
│                                              │ Link                                             │
│                                              ▼                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────┐  │
│   │                                 JOBS TABLE                                               │  │
│   ├─────────────────────────────────────────────────────────────────────────────────────────┤  │
│   │                                                                                         │  │
│   │   fldTvEi44E8tSTsWL  │  "Title"                           │  Job name                  │  │
│   │   fldWdgCRTKzRJBPXI  │  "Preappraisal Questions Template" │  JSON (master for role)    │  │
│   │                                                                                         │  │
│   └─────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘


                                    ┌─────────────────────┐
                                    │     MAKE.COM        │
                                    │   (Automation)      │
                                    └──────────┬──────────┘
                                               │
                                               │ Reads from Airtable:
                                               │ - Applicant's Override JSON
                                               │ - OR Effective JSON
                                               │
                                               ▼
                                    ┌─────────────────────┐
                                    │  Generate Word Doc  │
                                    │  with questions     │
                                    │  → Email to user    │
                                    └─────────────────────┘
```

---

## Key Concepts

### 1. Template vs Override vs Snapshot

| Concept | Storage | Purpose |
|---------|---------|---------|
| **Template** | Jobs table | Master questions for a role. Changing this affects **future** appraisals only. |
| **Override** | Applicants table | Customized questions for this specific applicant. Used by Make.com for document generation. |
| **Snapshot** | Appraisal History | Immutable copy saved when appraisal is created. For historical viewing only. |

### 2. Why Three Copies?

```
Template (Jobs)     →  "What questions should new appraisals start with?"
          │
          │ Copy on new appraisal
          ▼
Override (Applicants) →  "What questions will Make.com use for THIS person?"
          │
          │ Snapshot on save
          ▼
History Snapshot    →  "What questions were used for THAT past appraisal?"
```

### 3. Make.com Integration

Make.com scenario reads from **Applicants table**:
- Primary: `fldCmnvIXn1o2nDrx` (Override JSON)
- Fallback: `fldHKo0Qwki2hba7K` (Effective JSON - formula field)

The Override field is always populated when a new appraisal is created, so Make.com will always have questions to use.
