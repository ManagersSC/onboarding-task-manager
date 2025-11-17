## Onboarding Quiz Submissions (Applicant Drawer)

### Overview
Displays a list of quiz submissions for an applicant when onboarding is active (started and not paused). Admins can see each submission’s score/pass status and open a modal to view all answers.

### API
- `GET /api/admin/users/:id/quiz-submissions`
  - Returns:
    - `submissions`: `{ id, quizTitle, score, totalScore, passed, submittedAt, answers: { [questionId]: answer } }[]`
    - `questionsById`: `{ [questionId]: { content } }`
  - Source tables (see `ATS_schema.txt`):
    - Onboarding Quiz Submissions
    - Onboarding Quiz Items (question `Content`)

### Hook
- `useQuizSubmissions(applicantId, options?)`
  - SWR-based; returns `{ submissions, questionsById, isLoading, error, refresh }`.

### UI
- Location: `components/admin/users/applicant-drawer.js`
- Placement: Below the Monthly Review section in wide view.
- Elements:
  - Card header: “Onboarding Quizzes” + Refresh button
  - List: quiz title, timestamp, “Score: X / Y”, Passed/Failed badge, Eye button
  - Modal: `QuizSubmissionAnswersModal` shows Q&A mapped via `questionsById`.

### Visibility logic
- Render only when:
  - `applicant.onboardingStartDate` is valid, and
  - `!applicant.onboardingPaused`


