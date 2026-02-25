# Smile Cliniq — Client Operations Manual

> **For:** Admins and Staff
> **Last updated:** February 2026
> **Need help?** See [Who to Contact](#who-to-contact) at the bottom of this document

---

## Table of Contents

1. [What This System Does](#1-what-this-system-does)
2. [Who Uses What (Roles)](#2-who-uses-what-roles)
3. [What Happens Automatically](#3-what-happens-automatically)
4. [Your Dashboard at a Glance](#4-your-dashboard-at-a-glance)
5. [Daily Operations](#5-daily-operations)
   - [Adding a New Hire](#adding-a-new-hire)
   - [Assigning Onboarding Tasks](#assigning-onboarding-tasks)
   - [Uploading Documents](#uploading-documents)
   - [Managing Quizzes](#managing-quizzes)
   - [Sending a Custom Email](#sending-a-custom-email)
6. [Common Task Walkthroughs](#6-common-task-walkthroughs)
7. [Notification Settings](#7-notification-settings)
8. [Troubleshooting](#8-troubleshooting)
9. [FAQ](#9-faq)
10. [Who to Contact](#10-who-to-contact)

---

## 1. What This System Does

Before this platform existed, onboarding a new dental team member meant chasing people for documents by email, manually tracking who had completed what, and hoping nothing fell through the cracks.

**The Smile Cliniq Onboarding Task Manager replaces all of that.** It gives you:

- One place to manage every new hire's onboarding from application to first day
- Automatic emails and notifications so staff are always informed without manual chasing
- A clear checklist of every task a new hire needs to complete
- Document storage so CVs, passports, and compliance docs are all in one place
- Quizzes and assessments with automatic scoring
- A complete audit trail of who did what and when

**What it is NOT:** This is not a payroll system, a scheduling rota, or an HR system. It handles the *onboarding process only* — getting a new hire from application to being ready to work.

> 📸 **Screenshot:** _Onboarding Task Manager homepage / login screen_

---

## 2. Who Uses What (Roles)

| Role | Who | What they can do |
|------|-----|-----------------|
| **Admin** | Practice manager, owner | Everything — manage users, create tasks, view all applicants, send emails, access audit logs |
| **Staff** | New hires and team members completing onboarding | See their own tasks, upload documents, take quizzes |

> **Important:** If you need to give someone access, an Admin must create their account. Staff members cannot create accounts for others.

> 📸 **Screenshot:** _User Management page showing role badges next to each staff member_

---

## 3. What Happens Automatically

This is the most important section for understanding what you do vs. what the system does.

The following things happen **automatically** — you do not need to do anything manually for these:

---

### When a new application is submitted

**What you do:** Share the application form link with the candidate (or they find it themselves).

**What happens automatically:**
- A record is created in the system for that applicant
- A notification is sent to the admin to review the new application
- The applicant's information is stored in Airtable ready for processing

---

### When you invite a new admin

**What you do:** Click "Invite Admin" in the User Management section and enter their email.

**What happens automatically:**
- An invitation email is sent to them with a link to set their password
- The link expires after use — it cannot be reused (security feature)
- Once they set their password, they can log in immediately

---

### When someone requests a password reset

**What you do:** Nothing — the user clicks "Forgot Password" on the login page themselves.

**What happens automatically:**
- A password reset email is sent to them with a secure link
- The link expires and can only be used once
- Their password is updated when they follow the link

---

### When onboarding begins for a new hire

**What you do:** Assign onboarding tasks to the new hire in the system.

**What happens automatically:**
- A notification is sent to relevant staff that onboarding has started
- The new hire's dashboard is populated with their tasks

---

### When a task is assigned

**What you do:** Click "Assign Task" and select the team member.

**What happens automatically:**
- The assigned person receives an email and/or Slack notification (depending on their notification preferences)
- The task appears in their dashboard immediately

---

### When notifications need to be sent

**What you do:** Nothing — notifications fire based on system events.

**What happens automatically:**
- Notifications are routed to email or Slack based on each staff member's preferences
- In-app notifications appear in the bell icon in the top navigation

---

### When you need to send a custom email

**What you do:** Go to the new hire tracker section in the admin dashboard, click on an employee, compose your message, and click send.

**What happens automatically:**
- The email is sent via the Make.com email system
- A record of the sent email is logged

---

### Summary table

| Situation | You do | System does automatically |
|-----------|--------|--------------------------|
| New application received | Share form link | Create record, notify admin |
| Inviting an admin | Click "Invite Admin" | Send invitation email |
| Password forgotten | Nothing | Send reset email to user |
| Onboarding starts | Assign tasks | Notify relevant staff |
| Task assigned | Click "Assign" | Notify assignee by email/Slack |
| General notifications | Nothing | Route to correct channel |
| Custom email | Compose + send | Deliver via email system |

---

## 4. Your Dashboard at a Glance

When you log in as an Admin, you'll see the main dashboard with:

| Metric | What it means |
|--------|--------------|
| **Active Onboardings** | New hires currently going through onboarding (not yet completed) |
| **Tasks Due This Week** | Tasks across all active onboardings that are due in the next 7 days |

The navigation on the left gives you access to:
- **Dashboard** — overview metrics
- **Applicants** — all new hire records
- **Tasks** — task templates and assignments
- **Quizzes** — manage onboarding assessments
- **Users** — manage staff accounts
- **Notifications** — your notification inbox
- **Audit Logs** — complete activity history
- **Resources** — shared document/link hub

> 📸 **Screenshot:** _Admin dashboard showing Active Onboardings and Tasks Due This Week metrics_

> 📸 **Screenshot:** _Left sidebar navigation with all sections visible_

---

## 5. Daily Operations

### Adding a New Hire

1. Go to **Applicants** in the left navigation
2. Click **"Add Applicant"** (or wait for them to submit the application form — this creates a record automatically)
3. Fill in the new hire's name, email, and role
4. Click **Save**
5. The applicant now appears in your Applicants list with status "New Application"

> **Tip:** If the applicant submitted the form themselves, their record is already there — just search for their name.

> 📸 **Screenshot:** _Applicants list page showing all new hires with their status_

> 📸 **Screenshot:** _Add Applicant form with fields filled in_

---

### Assigning Onboarding Tasks

1. Go to **Applicants** and click on the new hire's name
2. In their profile, click **"Assign Tasks"**
3. Select the task templates to assign (e.g. "Submit CV", "Complete DBS", "Watch induction video")
4. Set due dates for each task
5. Click **"Assign"**
6. The team member will receive an email notification automatically

> **Note:** Task templates are pre-created. If you need a new type of task, an Admin can create it under the **Tasks** section.

> 📸 **Screenshot:** _Assign Tasks modal showing task template list with due date fields_

> 📸 **Screenshot:** _Hire's profile page showing their assigned task list_

---

### Uploading Documents

**Uploading a document for a hire (admin):**
1. Go to **Applicants** → click the hire's name
2. Click **"Upload Document"**
3. Select the document type (CV, Passport, DBS, etc.)
4. Drag and drop the file or click to browse
5. Click **"Upload"**

**Accepted file types:** PDF, Word documents, JPEG, PNG, GIF, WebP
**Maximum file size:** 10 MB per file

> **If an upload fails:** Check that the file is not larger than 10 MB and is one of the accepted types.

> 📸 **Screenshot:** _Document upload modal with file type selector and drag-and-drop zone_

> 📸 **Screenshot:** _Hire's profile showing the Documents section with uploaded files listed_

---

### Managing Quizzes

Quizzes are assessments new hires take as part of their onboarding.

**To view quiz results:**
1. Go to **Applicants** → click the hire's name
2. Scroll to their task list
3. Quiz tasks show a quiz icon — click to see their submission and score

**To create or edit quizzes:**
1. Go to **Quizzes** in the navigation
2. Click an existing quiz to edit, or **"Create Quiz"** for a new one
3. Add questions (multiple choice, checkboxes, or info blocks)
4. Save — the quiz is now available to assign as a task

> 📸 **Screenshot:** _Quizzes page showing list of quizzes with question count_

> 📸 **Screenshot:** _Quiz builder showing question types (multiple choice, checkboxes, info block)_

> 📸 **Screenshot:** _Hire's quiz submission view showing their answers and score_

---

### Sending a Custom Email

1. Go to **Users** or the relevant applicant profile
2. Look for the **"Send Email"** option
3. Compose your message
4. Click **Send** — the email is delivered automatically via the email system

> 📸 **Screenshot:** _Custom email compose screen with recipient, subject, and body fields_

---

## 6. Common Task Walkthroughs

### Walkthrough: Onboarding a New Hire from Start to Finish

1. Hire submits application form (or admin adds them manually)
2. Admin reviews the application → changes status to "Hired"
3. Admin assigns onboarding tasks to the hire
4. Hire receives email notification and logs into their dashboard
5. Hire works through tasks: uploads documents, completes quizzes, reads materials
6. Admin reviews submitted documents and marks each task complete
7. Once all tasks are complete, the hire's onboarding is marked as finished

> 📸 **Screenshot:** _Hire's profile page showing completed tasks with green checkmarks_

---

### Walkthrough: Resetting a Staff Member's Password

1. The staff member goes to the login page and clicks **"Forgot Password"**
2. They enter their email address
3. They receive a reset link by email automatically
4. They click the link and set a new password
5. They can log in immediately

> **If they don't receive the email:** Ask them to check their spam folder. If still not found, contact your developer — the Make.com email automation may need checking.

---

### Walkthrough: Pausing an Onboarding

If a new hire's onboarding needs to be paused (e.g. they are delayed joining):

1. Go to **Applicants** → click the hire's name
2. Look for the **"Pause Onboarding"** option
3. Confirm the pause — their tasks remain assigned but are flagged as paused
4. To resume, return to their profile and click **"Resume Onboarding"**

---

### Walkthrough: Checking the Audit Log

The audit log records every significant action in the system — who did what and when.

1. Go to **Audit Logs** in the left navigation
2. Filter by date range, user, or action type
3. To export: click **"Export CSV"** — this downloads a spreadsheet of all logged actions

> 📸 **Screenshot:** _Audit Logs page showing action history with date, user, and action columns_

---

### Walkthrough: Managing Notification Preferences

Each staff member can control which notifications they receive:

1. Go to **Users** → click on a staff member's name
2. Find the **Notification Preferences** section
3. Toggle individual notification types on/off
4. Set their preferred channel: **Email**, **Slack**, or both
5. Save — changes take effect immediately

> 📸 **Screenshot:** _Notification preferences panel showing toggles for Email, Slack, and In-app per notification type_

---

### Walkthrough: Adding a Resource to the Resource Hub

The Resource Hub is a shared library of links and documents for staff.

1. Go to **Resources** in the navigation
2. Click **"Add Resource"**
3. Enter the title, link or upload file, and category
4. Save — it appears in the hub immediately for all staff

> 📸 **Screenshot:** _Resource Hub page showing resources listed by category_

---

## 7. Notification Settings

Staff can receive notifications in two places:

| Channel | How it works |
|---------|--------------|
| **In-app** | Bell icon in the top navigation — always active |
| **Email** | Sent automatically when an event occurs, if enabled in preferences |
| **Slack** | Posted to a Slack channel, if enabled in preferences and Slack is connected |

> **To change notification preferences:** Go to Users → select the staff member → Notification Preferences section.

> 📸 **Screenshot:** _In-app notification bell open showing unread notifications_

---

## 8. Troubleshooting

### Tasks not appearing in a hire's dashboard

- Try refreshing the page (press F5)
- Confirm the task was actually assigned — go to the hire's profile and check their task list
- If tasks are there but not showing: contact your developer, it may be a caching issue

### Automated email not received

1. Ask the recipient to check their spam/junk folder
2. Check that the email address on file is correct (go to their profile)
3. If the email is correct and not in spam: contact your developer — the Make.com email automation may have an error

### Login not working

- Check that Caps Lock is not on
- Try **"Forgot Password"** to reset — do not guess repeatedly as the account will be locked after too many attempts
- If the "Forgot Password" email doesn't arrive, contact your developer

### Document upload failing

- Check the file is under 10 MB
- Check the file type is PDF, Word, JPEG, PNG, GIF, or WebP
- Try a different browser if the issue persists
- If still failing: contact your developer

### Dashboard metrics look wrong

- The numbers update in real time. If they look wrong, try refreshing the page
- Active Onboardings counts hires who are in progress (not completed). If a hire finished but is still counted, check their onboarding status in their profile
- If numbers are still wrong after checking: contact your developer

### A new hire can't log in to their dashboard

1. Confirm they signed up using the correct email address
2. Confirm their account exists — go to Users and search for them
3. If the account doesn't exist, they may need to re-register or an admin needs to create their account
4. If the account exists but they still can't log in, reset their password via their profile

### Slack notifications not working

- Check that the staff member has Slack enabled in their notification preferences
- Slack notifications require the Slack integration to be configured at the system level — if it's never worked, contact your developer to check the Make.com Slack connection

### The app is showing an error page / not loading

- Try refreshing the page
- Check your internet connection
- Try a different browser
- If the entire site is down: go to [vercel.com](https://vercel.com) and check the deployment status, or contact your developer

---

## 9. FAQ

**Q: Can I delete a task that was assigned by mistake?**
A: Admins can manage assigned tasks from the **Assigned Tasks** page (`/admin/assigned-tasks`). Note: the delete functionality for individual tasks is not yet implemented — contact us if you need a task removed and we can handle it directly.

**Q: Can two people have the same email address?**
A: No. Each email address must be unique in the system.

**Q: What happens to a hire's data if I delete their account?**
A: This is a permanent action. Contact your developer before deleting any applicant records, as data in Airtable may also be affected.

**Q: Can I change the task templates?**
A: Yes — go to the Tasks section and edit any task template. Changes affect new assignments only; existing assigned tasks are not changed.

**Q: How long are documents stored?**
A: Documents are stored in Airtable indefinitely. There is no automatic deletion.

**Q: Is there a mobile app?**
A: No — the system is a web app that works in any browser on mobile, tablet, or desktop. No separate app needs to be installed.

**Q: What if Make.com (the automation service) is down?**
A: The web app will still work — staff can still log in and documents can still be uploaded. However, two things will stop working: automatic email notifications and task assignment (since task assignment emails are delivered through Make.com). You would need to notify people manually and defer any task assignments until Make.com is restored.

**Q: Can I see who made a change in the system?**
A: Yes — go to Audit Logs. Every significant action is recorded with the user's name and timestamp.

---

## 10. Who to Contact

This platform was built and is maintained by **FlowFusion AI**. For any technical issues, changes, or questions, please reach out to us directly.

| Issue | Who to contact |
|-------|----------------|
| Something in the app is broken | **FlowFusion AI** — reach out via email or WhatsApp |
| Make.com automation not working (emails not sending, etc.) | **FlowFusion AI** — we monitor and manage all Make.com scenarios |
| Airtable data issue (record incorrect, automation not firing) | **FlowFusion AI** — we manage the Airtable base and automations |
| Hosting issue (site down or not loading) | **FlowFusion AI** — we manage the Vercel deployment |
| Requesting a new feature or change | **FlowFusion AI** — get in touch and we'll scope it out |

> **When reporting an issue:** Please describe the exact steps that led to the problem, what you expected to happen, and what actually happened. A screenshot is extremely helpful and speeds up resolution significantly.

---

*For technical details about how this system is built, see the [Technical Overview](technical-overview).*
