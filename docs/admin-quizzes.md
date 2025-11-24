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
- Onboarding Quizzes: `Quiz Title`, `Passing Score`, `Week`, links to `Onboarding Quiz Questions` and `Submissions`.
- Onboarding Quiz Items: `Type`, `Q.Type` (Radio/Checkbox), `Content`, `Options` (multiline string, `<br>`-joined), `Correct Answer`, `Order`, `Points`, link to quiz.
- Onboarding Quiz Submissions: `Quiz Title` (formula), `Passed?`, `Score`, `Total Form Score`, `Submission Timestamp`, `Respondent Email`, links to `Applicants` and `Onboarding - Quizzes`, `Answers` (JSON string).

### Options field handling
- Airtable `Options` is stored as a multiline string joined by `<br>` (HTML). In some cases, values can be HTML-escaped: `&lt;br>`.
- Utility provided at `src/lib/quiz/options.js`:
  - `splitOptionsString(raw)` → string[]
  - `joinOptionsArray(options)` → string
  - `validateCorrectAnswer(correctAnswer, questionType, options)` → boolean

Rules:
- Radio: Correct Answer must be exactly one of the options.
- Checkbox: Correct Answer may represent multiple options (stored either as `<br>`-joined string or array); each must match an option.

### Current state
- Subtle “View all” link added in Applicant Drawer.
- Admin page scaffolded with tabs and search box; ready to connect to API.
- Submissions endpoint implemented for filtering; returns `submissions` and `questionsById`.

### Roadmap
- Wire Submissions UI to `/api/admin/quizzes/submissions` with pagination and filters.
- Build Quizzes manager and Questions editor using the Options utility; add validations and rescoring workflow.
- Add analytics (pass rate, average score, item difficulty) and CSV export.


