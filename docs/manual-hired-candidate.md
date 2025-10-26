## Manual Hired Candidate Creation

### Overview

Admins can now create a candidate who is already hired and ready to start onboarding. This bypasses the normal invite flow.

### UI

- Location: `admin → Users → Add Applicant`
- Tabs:
  - Invite by Email (existing)
  - Create Hired Candidate (new)

Create Hired Candidate form fields:
- Name (required)
- Email (required)
- Job Name (optional)

Implicit settings on creation:
- `Stage` → `Hired`
- `Onboarding Manual Import` → `true`
- `Job Board` → `Manual`

Out of scope (handled elsewhere):
- `Onboarding Start Date`
- Onboarding initiation flows

### Backend

Server action: `src/app/admin/users/actions.js` → `createHiredApplicant({ name, email, jobName })`
- Creates or converts an `Applicants` record by `Email`
- Sets the fields above; does not start onboarding

### Notes

- If an applicant already exists for the email, the record is updated (converted to Hired) rather than duplicated.
- Validation ensures name and email are provided. Additional fields like phone/manager can be added in a future iteration.



