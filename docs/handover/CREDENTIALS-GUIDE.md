# Credentials & Access Guide

> **SECURITY WARNING**
>
> This file is a **template only** — it contains no real credentials.
>
> Fill in the real values and deliver via ONE of these secure methods:
> - **1Password** or **Bitwarden** shared vault (strongly recommended)
> - **Encrypted PDF** sent via a secure channel (not email)
>
> **Never:**
> - Commit real credentials to this file (it's in git)
> - Send credentials via email or Slack
> - Share credentials in a Notion page or Google Doc
>
> **After completing the handover call, confirm the client can access every item in this guide without your help.**

---

## How to Use This Guide

Each section below lists a service the client needs access to. For each:

1. Fill in the real credentials in a separate secure document/vault
2. Transfer account ownership where possible (Vercel, Airtable, Make.com)
3. Confirm the client can log in themselves during the handover call
4. Set up two-factor authentication on all accounts

---

## 1. The Web Application

| Item | Value |
|------|-------|
| Production URL | `https://onboarding.smilecliniq.com` |
| Admin login email | *(fill in)* |
| Admin login password | *(fill in — client should change this after handover)* |

> The web app is hosted on Vercel (see section 4). The login credentials above are for the **app itself**, not Vercel.

---

## 2. Airtable

Airtable is the database behind the web app. The client should have **Owner** access.

| Item | Value |
|------|-------|
| Airtable login email | *(fill in)* |
| Airtable login password | *(fill in)* |
| Base name | *(fill in — e.g. "Smile Cliniq Onboarding")* |
| Base URL | `https://airtable.com/[BASE_ID]` |
| API key | *(fill in — this is in the Vercel env vars too)* |

**How to access Airtable:**
1. Go to [airtable.com](https://airtable.com) and log in
2. Find the base named above in the workspace
3. This is the live database — changes here affect the app immediately

**Important:** Do not rename or delete columns (fields) — this will break the app.

---

## 3. Make.com

Make.com runs the 7 automations (email notifications, webhook integrations). The client should have access to view the scenarios, but should not edit them without developer help.

| Item | Value |
|------|-------|
| Make.com login email | *(fill in)* |
| Make.com login password | *(fill in)* |
| Organization name | *(fill in)* |

**Scenario names to look for:**
1. New Application Form Intake
2. Admin Invite Email
3. Password Reset Email
4. Onboarding Start Notification
5. Task Assignment Notification
6. General Notifications (Email + Slack routing)
7. Custom Email

**How to check if an automation is running:**
1. Log in to Make.com
2. Go to **Scenarios**
3. Each scenario shows its last run status (green = success, red = error)
4. Click a scenario → **History** to see recent runs and any error messages

**Blueprint exports** (for re-importing scenarios if needed) are in the `docs/handover/automations/` folder in the repository.

---

## 4. Vercel (Hosting)

The web app is hosted on Vercel. The client should be added as a team member.

| Item | Value |
|------|-------|
| Vercel login email | *(fill in)* |
| Vercel team / account | *(fill in)* |
| Project name | *(fill in)* |
| Production URL | `https://onboarding.smilecliniq.com` |

**How to check if the app is running:**
1. Go to [vercel.com](https://vercel.com) and log in
2. Find the project
3. The status should show **"Ready"** — if it shows an error, a deployment has failed

**How to roll back to a previous version:**
1. Go to the project → **Deployments** tab
2. Find the last working deployment (status: Ready)
3. Click the three-dot menu → **Promote to Production**

---

## 5. Google Calendar

The app integrates with Google Calendar for interview/event scheduling.

| Item | Value |
|------|-------|
| Google account email | *(fill in)* |
| Google account password | *(fill in — use Google account recovery if needed)* |
| OAuth client ID | *(fill in — also in Vercel env vars)* |
| OAuth client secret | *(fill in — also in Vercel env vars)* |
| Refresh token | *(fill in — also in Vercel env vars)* |

**If the Google Calendar integration stops working:**
- The OAuth refresh token may have expired
- The developer needs to re-run the Google OAuth flow to generate a new refresh token
- Then update `GOOGLE_REFRESH_TOKEN` in the Vercel environment variables

---

## 6. Vercel Environment Variables (All Secret Keys)

These are the internal secret keys used by the app. They are set in Vercel → Project → Settings → Environment Variables. **They should never be shared publicly.**

| Variable | Purpose | Value |
|----------|---------|-------|
| `SESSION_SECRET` | Encrypts login session cookies | *(fill in)* |
| `JWT_SECRET` | Signs password reset + invite tokens | *(fill in)* |
| `AIRTABLE_API_KEY` | Airtable API access | *(fill in)* |
| `AIRTABLE_BASE_ID` | Identifies the Airtable base | *(fill in)* |
| `APP_BASE_URL` | App URL for CORS and links | `https://onboarding.smilecliniq.com` |
| `GOOGLE_CLIENT_ID` | Google OAuth | *(fill in)* |
| `GOOGLE_CLIENT_SECRET` | Google OAuth | *(fill in)* |
| `GOOGLE_REDIRECT_URI` | Google OAuth | *(fill in)* |
| `GOOGLE_REFRESH_TOKEN` | Google long-lived token | *(fill in)* |
| `MAKE_WEBHOOK_URL_NEW_APPLICATION_FORM` | Make.com Scenario 1 URL | *(fill in)* |
| `MAKE_WEBHOOK_URL_ADMIN_PASSWORD_PAGE` | Make.com Scenario 2 URL | *(fill in)* |
| `MAKE_WEBHOOK_URL_RESET_PASSWORD` | Make.com Scenario 3 URL | *(fill in)* |
| `MAKE_WEBHOOK_URL_ONBOARDING_NOTIFICATION` | Make.com Scenario 4 URL | *(fill in)* |
| `MAKE_WEBHOOK_URL_TASK_ASSIGNMENT` | Make.com Scenario 5 URL | *(fill in)* |
| `MAKE_WEBHOOK_URL_NOTIFICATIONS` | Make.com Scenario 6 URL | *(fill in)* |
| `MAKE_WEBHOOK_URL_CUSTOM_EMAIL` | Make.com Scenario 7 URL | *(fill in)* |

---

## 7. Source Code Repository

| Item | Value |
|------|-------|
| Platform | GitHub |
| Repository URL | *(fill in)* |
| Main branch | `main` |
| Access level | *(client should have at least Read access)* |

---

## 8. Developer Contact

The developer who built this system can be reached for:
- Debugging broken automations
- Adding new features
- Emergency support if the app goes down

| Item | Value |
|------|-------|
| Name | *(fill in)* |
| Email | *(fill in)* |
| Phone / WhatsApp | *(fill in)* |
| Typical response time | *(fill in)* |
| After-hours contact | *(fill in)* |

---

## Handover Confirmation Checklist

Before the handover is complete, confirm the client can do each of these **without the developer's help**:

- [ ] Log in to the web app at `https://onboarding.smilecliniq.com`
- [ ] Log in to Airtable and find the correct base
- [ ] Log in to Make.com and view the scenarios
- [ ] Log in to Vercel and check deployment status
- [ ] Access all credentials from the 1Password vault (or wherever stored)
- [ ] Locate the developer's contact details

---

*This file contains no real credential values — see your secure 1Password vault or encrypted document for actual values.*
