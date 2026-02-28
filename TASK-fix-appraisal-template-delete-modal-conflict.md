# Fix: Appraisal Template Delete Question Modal Conflict

**Branch:** `fix/appraisal-template-delete-modal-conflict`
**Description:** When deleting a question inside the Edit Template modal, the delete confirmation AlertDialog causes the parent Dialog to dismiss — closing the editor without actually removing the question.

## Sub-tasks

- [x] Add `onPointerDownOutside` and `onInteractOutside` handlers to `DialogContent` in `AppraisalQuestionEditor` to prevent the parent modal from closing when a nested AlertDialog is open
- [ ] Commit and push the fix
