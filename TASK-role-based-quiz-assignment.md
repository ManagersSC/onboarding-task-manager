# TASK: Role-Based Quiz Assignment

**Branch**: `feat/role-based-quiz-assignment`
**Status**: In Progress

## Problem

The client reports "everyone is getting the quiz" — nurses and receptionists both see every quiz regardless of their job role. Root causes:
1. `Onboarding Quizzes` Airtable table has **no `Target Roles` field**
2. `/api/user/quizzes` (GET) fetches ALL task-log-linked quizzes with zero role filtering
3. No bulk-assign-by-role workflow — admins assign per-individual, often to everyone

## Client Question Answered

> "How do we assign different quizzes for nurses and receptionists according to roles?"

After this fix, the workflow will be:
1. Admin creates a quiz → sets `Target Roles = ["Dental Nurse"]`
2. Admin clicks "Assign to Roles" → system auto-creates task logs for all Dental Nurses
3. When a Dental Nurse logs in, they see only their quizzes. A Receptionist does NOT see nurse quizzes — the server-side role filter blocks it even if accidentally assigned.

## Pre-requisite (Client Must Do This in Airtable)

In the `Onboarding Quizzes` Airtable table, add:
- **Field name**: `Target Roles`
- **Field type**: Multi-select
- **Options**: `Dental Nurse`, `Receptionist`, `Dentist` (add more roles as needed)
- **Leave blank** = quiz applies to ALL roles (backward compatible with existing quizzes)

> **Implementation cannot be fully tested until the client makes this Airtable change.**

## Key Architecture Context

- `Applicants` table → `Job Name` field (text): `"Dental Nurse"`, `"Receptionist"`, `"Dentist"`
- `Onboarding Quizzes` table → currently no role field (adding `Target Roles`)
- `Onboarding Tasks Logs` table → links applicants to quiz tasks via `Assigned` and `Onboarding Quizzes` fields; also has `Applicant Job` (text) field
- `/api/user/quizzes` only checks `FIND(email, ARRAYJOIN({Assigned}))` — no role check at all

Reuse patterns:
- Task log creation: `src/app/api/admin/tasks/create-task/route.js` lines 137–228
- Airtable FIND formula for job: `core-tasks/route.js` line 97
- Airtable chunk creates (10 per request): `quizzes/route.js` lines 117–120

## Sub-tasks

- [x] **Step 0** — Create branch + this TASK doc
- [x] **Step 1** — `src/app/api/admin/quizzes/route.js`: Add `Target Roles` to GET list + POST create
- [x] **Step 2** — `src/app/api/admin/quizzes/[quizId]/route.js`: Add `Target Roles` to PUT update
- [x] **Step 3** — `src/app/api/user/quizzes/route.js`: Refactor `getApplicantIdByEmail` to return `jobName`, add role filter gate
- [x] **Step 4** — Create `src/app/api/admin/quizzes/[quizId]/bulk-assign/route.js` (new file)
- [x] **Step 5** — `src/app/admin/quizzes/page.js`: Add `KNOWN_ROLES`, Target Role select in create/edit dialogs, role badge in list, Bulk Assign button

---

## Detailed Implementation

### Step 1 — `src/app/api/admin/quizzes/route.js`

**GET** (line 23–25): Add `"Target Roles"` to `fields` array. In `map()` after line 32:
```js
targetRoles: r.get("Target Roles") || []
```

**POST** (line 52): Add `targetRoles` to destructure. In `quizFields` object (after line 91):
```js
if (Array.isArray(targetRoles) && targetRoles.length > 0) {
  quizFields["Target Roles"] = targetRoles
}
```

Commit: `feat: read and write Target Roles field on quiz create/list`

---

### Step 2 — `src/app/api/admin/quizzes/[quizId]/route.js`

In `PUT` handler patch section (after line 24):
```js
if (Array.isArray(body.targetRoles)) patch["Target Roles"] = body.targetRoles
```
Note: allow empty array `[]` to clear/reset roles.

Commit: `feat: allow updating Target Roles on quiz edit`

---

### Step 3 — `src/app/api/user/quizzes/route.js` ← CORE FIX

**a)** Rename `getApplicantIdByEmail` → `getApplicantRecord`, return `{ id, jobName }`:
```js
async function getApplicantRecord(userEmail) {
  const applicants = await base(APPLICANTS)
    .select({ filterByFormula: `{Email} = '${userEmail}'`, maxRecords: 1, fields: ['Job Name'] })
    .firstPage()
  return { id: applicants[0]?.id, jobName: applicants[0]?.fields?.['Job Name'] || null }
}
```

**b)** Line 33: `const { id: applicantId, jobName: userJobName } = await getApplicantRecord(user.userEmail)`

**c)** After line 91 (after `quizRec` fetched, before submissions check), add:
```js
const targetRoles = quizRec.get("Target Roles") || []
if (targetRoles.length > 0 && userJobName && !targetRoles.includes(userJobName)) {
  return null // role mismatch
}
```

Commit: `fix: filter user quizzes by job role to prevent cross-role visibility`

---

### Step 4 — NEW: `src/app/api/admin/quizzes/[quizId]/bulk-assign/route.js`

New `POST` handler:
1. Validate admin session (copy from `route.js` lines 9–16)
2. Parse `{ roles }` from body; if empty, fetch quiz `Target Roles` from Airtable
3. Build OR formula for role matching:
   ```js
   const roleConditions = roles.map(r => `FIND('${r}', {Job Name}) > 0`).join(', ')
   const formula = roles.length === 1 ? roleConditions : `OR(${roleConditions})`
   ```
4. Query `Applicants` with that formula, fields: `['Job Name', 'Email']`
5. For each applicant, check for existing task log (avoid duplicates):
   ```
   AND(FIND('${applicantId}', ARRAYJOIN({Assigned})), FIND('${quizId}', ARRAYJOIN({Onboarding Quizzes})))
   ```
6. Collect applicants without existing logs → batch create `Onboarding Tasks Logs` records (10 per chunk):
   ```js
   { fields: { "Assigned": [applicant.id], "Onboarding Quizzes": [quizId], "Status": "Assigned", "Applicant Job": applicant.fields["Job Name"] || "" } }
   ```
7. Return `{ created: N, skipped: N, roles }`

Commit: `feat: add bulk-assign-by-role API endpoint for quizzes`

---

### Step 5 — `src/app/admin/quizzes/page.js`

**a)** Above component (line 30), add:
```js
const KNOWN_ROLES = ["Dental Nurse", "Receptionist", "Dentist"]
```

**b)** `createQuiz` state (line 140): add `targetRoles: []`

**c)** Create dialog: Below the Week `<Input>`, add a labeled checkbox group using existing `<Checkbox>` + `<Label>` imports (already at line 25). Toggle roles in `createQuiz.targetRoles`. Pass `targetRoles: createQuiz.targetRoles` in POST body.

**d)** Edit state in `openEdit` (line 173): add `targetRoles: quiz.targetRoles || []`. Add same checkbox group in edit dialog. Include in PUT body.

**e)** Quiz list: display `<Badge>` per role (import already at line 14). If empty, show `<Badge variant="secondary">All Roles</Badge>`.

**f)** Per quiz card, add "Assign to Roles" `<Button>`:
```js
onClick={async () => {
  const res = await fetch(`/api/admin/quizzes/${quiz.id}/bulk-assign`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roles: quiz.targetRoles })
  })
  const data = await res.json()
  if (res.ok) toast.success(`Assigned ${data.created} applicant(s) — ${data.skipped} already assigned`)
  else toast.error("Bulk assignment failed")
}}
```

Commit: `feat: add Target Roles UI and bulk-assign button to admin quiz management`

---

## Verification Checklist

- [ ] Airtable: `Target Roles` multi-select field exists in `Onboarding Quizzes`
- [ ] `npm run dev` → `/admin/quizzes?tab=quizzes`
- [ ] Create quiz with `Target Roles = ["Dental Nurse"]` → verify field set in Airtable
- [ ] Edit quiz, add/remove roles → verify Airtable field updates
- [ ] Dental Nurse applicant login → `/api/user/quizzes` returns nurse quiz
- [ ] Receptionist applicant login → nurse quiz does NOT appear
- [ ] Quiz with empty `Target Roles` → visible to ALL roles
- [ ] "Assign to Roles" button → Airtable shows new task logs only for matching-role applicants
- [ ] Re-click "Assign to Roles" → no duplicate task logs created
- [ ] `npm run lint` passes
- [ ] `npm test` passes

## Other Bugs Noted (Do NOT fix in this branch)

1. **Localhost agent logging in production**: `fetch('http://127.0.0.1:7242/ingest/...')` in `quizzes/route.js` line 124 and `[quizId]/route.js` line 80
2. **Quiz item delete formula**: `route.js` DELETE uses `{Quiz ID}` (line 61) — verify this matches actual Airtable field name `Quiz Link` or items won't be deleted
