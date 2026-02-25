# Hiring Guide

_Last updated: February 2026_

This guide covers the Application Tracking System (ATS) — the Airtable-based system used to manage job candidates from first application through to being hired.

> **Note:** The ATS lives entirely in Airtable. It is separate from the Onboarding Task Manager web app, although the two share the same database. You manage candidates directly in Airtable.

---

## 1. The Applicants Table

All candidates are stored in the **Applicants** table in Airtable. Each row is one candidate.

Key fields you'll work with regularly:

| Field | What it is |
|---|---|
| **Name** | Candidate's full name |
| **Email** | Candidate's email (unique identifier) |
| **Stage** | Current stage in the hiring pipeline (see below) |
| **Applying For** | Linked to the Jobs table — which role they applied for |
| **Interview Location** | Which branch they'll interview at |
| **Interviewer** | Linked to Staff table — who is interviewing them |
| **CV** | Uploaded CV attachment |
| **Stage History** | Auto-updated JSON log of stage changes with timestamps |
| **Onboarding Manual Import** | Checkbox — tick this if manually adding a hired staff member to skip the automated hiring emails |

> 📸 **Screenshot:** _Airtable Applicants table grid view showing key fields_

> 📸 **Screenshot:** _Airtable Applicants table — example candidate record opened_

---

## 2. The Hiring Pipeline (Stages)

Candidates move through these stages. Some transitions trigger automatic emails; others are manual.

```
New Application
      ↓
First Interview Invite Sent  ──── (auto: sends interview invite email with DISC + Cal.com link)
      ↓
Reviewed                     ──── (auto: interviewer submits feedback form → stage updates)
      ↓
Second Interview Invite Sent ──── (auto: sends second interview invite email with Cal.com link)
      ↓
Reviewed (2nd)               ──── (auto: interviewer submits feedback form → stage updates, merges records)
      ↓
Hired                        ──── (auto: sends hired welcome email + new starter docs + notifies managers)
      │
      └─ Rejected             ──── (auto: sends rejection email)
      └─ Rejected - Liked     ──── (manual flag only — no email sent, candidate saved for future roles)
```

> 📸 **Screenshot:** _Stage field dropdown showing all stage options_

### What "Automatic" means at each stage

| Stage you set | What happens automatically |
|---|---|
| **First Interview Invite Sent** | Make.com sends the candidate an email with: (1) DISC assessment link, (2) personalised DISC PDF upload form, (3) Cal.com booking link pre-filled with their name, email, and location |
| **Hired** | Make.com sends the candidate a welcome email with the "Welcome to Smile Cliniq" PDF and New Starter Document form attached. Separately, managers@smilecliniq.com receives a notification email prompting them to set the start date in the onboarding platform |
| **Rejected** | Make.com sends a standard rejection email to the candidate |
| **Second Interview Invite Sent** | Make.com sends the candidate a second interview invite with a Cal.com booking link |
| **Reviewed / Reviewed (2nd)** | Set automatically when the interviewer submits their feedback form — you don't set this manually |

---

## 3. Moving a Candidate Through Stages

### Step-by-step: Progressing a candidate

1. Open the candidate's record in Airtable
2. Click the **Stage** field
3. Select the new stage from the dropdown
4. Save the record

That's it — the automation fires immediately. You'll see the Stage History field update automatically.

> 📸 **Screenshot:** _Editing the Stage field on a candidate record_

### Before setting "First Interview Invite Sent"

Make sure these fields are filled in on the candidate's record first:

- **Interviewer** — linked to the correct staff member (their Cal.com link is pulled from here)
- **Interview Location** — set to the correct branch (used to personalise the Cal.com booking URL)

If these are missing, the interview invite email will fall back to a generic Cal.com link.

> 📸 **Screenshot:** _Candidate record with Interviewer and Interview Location fields highlighted_

### Before setting "Hired"

Confirm:
- **Onboarding Manual Import** is **unchecked** (leave it unchecked for new hires — only check it if manually importing an existing staff member who doesn't need onboarding emails)

When set to Hired with the box unchecked, the system will also automatically create a task in the Tasks table with a calculated due date (excluding weekends) — this is the manager's prompt to set the onboarding start date.

---

## 4. The Interview Process

### DISC Assessment
When a first interview invite is sent, the candidate receives a 3-step email:
1. Complete the DISC personality assessment at tonyrobbins.com/disc
2. Upload their DISC PDF results via a personalised Airtable form
3. Book their interview time via Cal.com

The DISC PDF upload form is pre-personalised per candidate using their email address stored in Airtable.

> 📸 **Screenshot:** _Example first interview invite email showing the 3-step layout_

### Cal.com Booking Links
Each interviewer in the Staff table has two Cal.com links stored:
- **Cal Link - First Interview** — used for first interview bookings
- **Cal Link - Second Interview** — used for second interview bookings

Make.com appends the branch location slug to these links automatically (e.g. `/sc-manager/interview-{location}`), so bookings are routed to the correct branch.

> 📸 **Screenshot:** _Staff record in Airtable showing Cal Link fields_

### Feedback Forms
After each interview, the interviewer submits a **Feedback Form** (an Airtable form). The form asks:
- Which interview stage this is (First Interview or Second Interview)
- Their assessment notes and score

**What happens automatically:**
- If First Interview feedback is submitted → candidate stage changes to **Reviewed**
- If Second Interview feedback is submitted → candidate stage changes to **Reviewed (2nd)**, and the first and second interview feedback records are merged into one combined record

> 📸 **Screenshot:** _Airtable feedback form (interviewer view)_

---

## 5. Document Collection

### New Starter Documents (Post-Hire)
When a candidate is marked as **Hired**, they receive an email containing:
- "Welcome to Smile Cliniq" PDF
- "SC New Employee Starter Forms" PDF
- A link to the **New Starter Document Form** — an Airtable form where they submit their personal details, right-to-work documents, and other required information

### Document Submission Processing
When a candidate submits any document form:
1. A new record is created in the **Documents** table
2. The system automatically finds the matching candidate by email
3. The candidate record is linked to the new document record
4. A Make.com scenario (`RECEIVED_JOB_DOCUMENTS`) is triggered to process the submission

> 📸 **Screenshot:** _Documents table in Airtable showing submitted documents_

---

## 6. The Jobs Table

Job postings are managed in the **Jobs** table in Airtable. Each job record contains:

| Field | What it is |
|---|---|
| **Title** | Job title (e.g. Dentist, Nurse, Receptionist, Manager) |
| **Job Status** | Active / Inactive |
| **Description** | Role description |
| **Required Experience** | Experience requirements |
| **Interviewers** | Linked to Staff — who interviews for this role |
| **Application Form** | URL to the Airtable application form for this role |

When a candidate's application comes in, Make.com uses the Job record ID to look up the role title and assign the correct interviewers.

> 📸 **Screenshot:** _Jobs table in Airtable_

---

## 7. Common Tasks

### Adding a candidate manually (existing staff)
If you're adding an existing staff member to the onboarding platform without going through the hiring pipeline:
1. Create a record in the Applicants table
2. **Check the "Onboarding Manual Import" checkbox** — this prevents automated hiring emails from firing
3. Set the Stage to **Hired**
4. In the Onboarding Task Manager web app, the admin can then start their onboarding manually

### Rejecting a candidate
1. Open their record
2. Set Stage to **Rejected** — an automated rejection email is sent
3. If you want to keep them on file for future roles, use **Rejected - Liked** instead — no email is sent, and they appear in a filtered view for future consideration

### Finding candidates for a specific role
Use Airtable's filtering or grouping on the Applicants table. Filter by **Applying For** to see all candidates for a specific job.

> 📸 **Screenshot:** _Airtable filter panel filtering by Applying For field_

---

## 8. Troubleshooting

**Interview invite email not sent after changing stage**
- Check that the **Interviewer** field is filled in on the candidate record
- Check that the **Interview Location** field is set
- Check Make.com — open the relevant scenario and check its execution history for errors

**Candidate not receiving emails**
- Verify their email address is correct in Airtable (no typos, no spaces)
- Check Gmail sent items for recruitment@smilecliniq.com
- Check Make.com execution history for the relevant scenario

**Stage not updating after feedback form submission**
- Check the Airtable automation "Feedback Submission" in the Change Stage group
- Ensure the feedback form's "Interview Stage" field was filled in correctly (must be exactly "First Interview" or "Second Interview")

**Candidate was marked Hired but no manager notification received**
- Check that "Onboarding Manual Import" was **unchecked**
- Check Make.com "Changes in Status" scenario execution history
