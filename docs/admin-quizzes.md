## Admin Quizzes Page

This page provides a centralized view for onboarding quizzes: submissions, quizzes, and question bank. It also supports deep-linking from the Applicant Drawer to view a specific applicant’s submissions.

### Location
- Route: `/admin/quizzes`

### Tabs
- Submissions: filterable list of all quiz submissions (default).
- Quizzes: list and manage quizzes (scaffold placeholder now; wire up later).
- Questions: question bank editor (scaffold placeholder now; wire up later).

### Deep-link from Applicant Drawer
- A subtle link “View all” appears in the applicant’s Onboarding Quizzes card.
- Click navigates to: `/admin/quizzes?tab=submissions&applicantId=<applicantRecordId>`
- The page applies the applicant filter automatically.

### Filters (via query params)
- `tab=submissions|quizzes|questions`
- `applicantId=<airtable_record_id>`
- `quizId=<airtable_record_id>`
- `passed=true|false`
- `from=YYYY-MM-DD`
- `to=YYYY-MM-DD`
- `week=<number>`
- `search=<string>`
- `minScore=<int>`
- `maxScore=<int>`

These are read from query params and applied server-side where possible and safe. Client UI mirrors the URL for shareable links.

### API

GET `/api/admin/quizzes/submissions`

Query params supported:
- `applicantId`, `quizId`, `passed`, `from`, `to`, `week`, `minScore`, `maxScore`, `search`, `limit` (<=100), `offset` (reserved for extended pagination).

Response:
```json
{
  "submissions": [
    {
      "id": "rec...",
      "quizTitle": "Quiz",
      "score": 8,
      "totalScore": 10,
      "passed": true,
      "submittedAt": "2025-01-01T10:00:00.000Z",
      "respondentEmail": "person@example.com",
      "answers": { "qid1": "Answer", "qid2": ["A", "B"] }
    }
  ],
  "questionsById": {
    "qid1": { "content": "Question text..." }
  }
}
```

Auth: admin-only (session cookie + role check).

Notes:
- When `applicantId` is provided, we resolve their Email and filter by Applicants linked text (consistent with existing applicant-specific endpoint).
- We also accept `quizId` to scope to a particular quiz.
- For now, we return one page (`pageSize` default 50). Advanced pagination can be added later.

### Airtable schema
- Onboarding Quizzes: `Quiz Title`, `Passing Score`, `Week`, `Target Roles` (singleSelect, field ID `fldSHMGQGWUxecF65`), links to `Onboarding Quiz Questions` and `Submissions`.
- Onboarding Quiz Items: `Type`, `Q.Type` (Radio/Checkbox), `Content`, `Options` (multiline string, `<br>`-joined), `Correct Answer`, `Order`, `Points`, link to quiz.
- Onboarding Quiz Submissions: `Quiz Title` (formula), `Passed?`, `Score`, `Total Form Score`, `Submission Timestamp`, `Respondent Email`, links to `Applicants` and `Onboarding - Quizzes`, `Answers` (JSON string).
- Applicants: `Job Name` (multipleLookupValues via field `fldd0RHjePJFSOoQP`, returns array — take `[0]` for the role string).

### Options field handling
- Airtable `Options` is stored as a multiline string joined by `<br>` (HTML). In some cases, values can be HTML-escaped: `&lt;br>`.
- Utility provided at `src/lib/quiz/options.js`:
  - `splitOptionsString(raw)` → string[]
  - `joinOptionsArray(options)` → string
  - `validateCorrectAnswer(correctAnswer, questionType, options)` → boolean

Rules:
- Radio: Correct Answer must be exactly one of the options.
- Checkbox: Correct Answer may represent multiple options (stored either as `<br>`-joined string or array); each must match an option.

### Role-Based Quiz Assignment

Quizzes can be targeted to specific job roles so applicants only see quizzes relevant to their position.

#### How it works

1. Each quiz has an optional `Target Roles` field (Airtable singleSelect: `Nurse`, `Receptionist`, `Dentist`).
2. When set, the field acts as a server-side gate in `/api/user/quizzes` — applicants whose `Job Name` doesn't match the target role will not see the quiz, even if a task log exists for them.
3. A quiz with no `Target Roles` set is visible to all roles (backward compatible).

#### Admin workflow

1. **Create** a quiz and select a **Target Role** from the dropdown (or leave as “All roles”).
2. Click **Assign** on the quiz card — the system finds all applicants in Airtable with a matching `Job Name` and creates `Onboarding Tasks Logs` records for those not already assigned. Duplicate assignments are skipped.
3. The quiz card displays a badge showing the target role (or “All Roles”).

#### Role values

Must match exactly what is stored in `Applicants.Job Name`:
- `Nurse`
- `Receptionist`
- `Dentist`

To add new roles, update the `KNOWN_ROLES` constant in `src/app/admin/quizzes/page.js` and the `VALID_ROLES` constant in both `src/app/api/admin/quizzes/route.js` and `src/app/api/admin/quizzes/[quizId]/bulk-assign/route.js`, then add the matching option to the `Target Roles` singleSelect field in Airtable.

### Current state
- Subtle “View all” link added in Applicant Drawer.
- Quizzes Admin includes Submissions and Quizzes tabs.
- Submissions endpoint implemented for filtering; returns `submissions` and `questionsById`.
- Quizzes tab lists quizzes (title, passing score, target role badge) with an Edit workflow:
  - Edit modal with Page Title, Passing Score, Target Role
  - Items editor with Type, Q.Type, Content, Order, Points
  - Options editor (list UI) and correct-answer pickers
  - Duplicate Order detection and auto-resequence dialog
  - Preview modal mirroring end-user layout
  - Assign button for bulk-assigning to matching applicants

### Roadmap
- Add analytics (pass rate, average score, item difficulty) and CSV export.
- Pagination for submissions and quizzes.

### API contracts (editor)
- GET `/api/admin/quizzes` → `{ quizzes: [{ id, title, passingScore, pageTitle, targetRole }] }`
- GET `/api/admin/quizzes/:quizId/items` → `{ items: [{ id, type, qType, content, options, correctAnswer, order, points }] }`
- POST `/api/admin/quizzes` body: `{ title, pageTitle, passingScore, week, items, targetRole? }`
- PUT `/api/admin/quizzes/:quizId` body: `{ pageTitle?, passingScore?, targetRole? }` — pass `null` to clear
- POST `/api/admin/quizzes/:quizId/bulk-assign` body: `{ roles?: string[] }` — if omitted, uses quiz's own Target Roles → `{ created, skipped, roles }`
- PUT `/api/admin/quizzes/items/:itemId` body: `{ type?, qType?, content?, options: string[]|string, correctAnswer?, order?, points? }`
- POST `/api/admin/quizzes/items/batch` body: `{ items: [{ id, order }, ...] }` (resequence)

