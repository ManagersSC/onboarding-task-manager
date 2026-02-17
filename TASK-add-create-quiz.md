# Task: Add Create New Quiz Feature

**Branch**: `feat/add-create-quiz` (based off `feature/init_claude_code`)

**Description**: Add a "Create New Quiz" feature to the admin quizzes page. Users can pick a week, set quiz metadata, and add/edit questions using a UI consistent with the existing edit modal.

## Sub-tasks

- [x] Create POST API endpoint for new quiz (`/api/admin/quizzes`)
- [x] Create POST API endpoint for new quiz items (`/api/admin/quizzes/[quizId]/items`)
- [x] Add "Create Quiz" modal to the quizzes admin page with week selector and question editor
- [x] Wire up the save flow (create quiz, then batch-create items)
- [x] Add "Add Item" button to the existing edit modal for adding questions to existing quizzes
