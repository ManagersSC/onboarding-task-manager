# Handover Delivery Plan

> **Project:** Smile Cliniq Onboarding Task Manager
> **Delivery deadline:** February 28, 2026
> **Prepared by:** Developer

---

## Overview

This folder contains the complete handover package for the Smile Cliniq Onboarding Task Manager. The package is split into three documents, each targeting a different audience.

---

## Document Map

| Document | Audience | Format for delivery |
|----------|----------|---------------------|
| [CLIENT-OPERATIONS-MANUAL.md](./CLIENT-OPERATIONS-MANUAL.md) | Clinic Manager, front-desk staff, daily operators | Copy into Notion OR export as PDF |
| [TECHNICAL-OVERVIEW.md](./TECHNICAL-OVERVIEW.md) | Future developer inheriting the project | This repo + PDF export |
| [CREDENTIALS-GUIDE.md](./CREDENTIALS-GUIDE.md) | Client admin + future developer | **Secure only** — fill in values and deliver via 1Password or encrypted PDF. Never share via email or commit to git. |
| [automations/README.md](./automations/README.md) + JSON files | Future developer | This repo + Make.com blueprint exports |

---

## Why Three Documents?

**The biggest mistake in software handovers** is writing one document that tries to serve a clinic manager and a developer at the same time. They have different mental models:

- A **clinic manager** needs: "what do I click when X happens?"
- A **developer** needs: "what breaks and where is the code?"

Mixing both in one document means neither person can find what they need quickly.

---

## Delivery Checklist

### Before the handover call
- [ ] Copy Client Operations Manual into Notion (preferred) or export as PDF
- [ ] Fill in real values in CREDENTIALS-GUIDE.md and deliver via 1Password or encrypted PDF
- [ ] Export all 7 Make.com scenario blueprints as JSON → place in `docs/handover/automations/`
- [ ] Screenshot each Make.com scenario's module overview — add to automations/ folder
- [ ] Take 10–15 annotated screenshots from the live app → link in CLIENT-OPERATIONS-MANUAL.md
- [ ] Confirm all environment variables are set correctly in Vercel production

### During the handover call
- [ ] Walk through the Client Operations Manual section by section (screen share)
- [ ] Demonstrate the 3 most common daily tasks live
- [ ] Show the client how to access Vercel dashboard and check deployment status
- [ ] Show the client where to find the credentials securely
- [ ] Confirm the client knows who to call when something breaks (add contact to credentials guide)

### After the handover call
- [ ] Send follow-up email with links to all three documents
- [ ] Give client read access to this repo (or the Notion version of the manual)
- [ ] Confirm Make.com and Airtable account ownership has been transferred or shared

---

## Make.com Handover Specifics

The 7 Make.com automations can be shared as:
1. **Blueprint exports** (JSON files) — place in `docs/handover/automations/`
2. **Screenshots** of each scenario's module chain — visual reference
3. **Invitation to the Make.com organization** — so the client can view/manage scenarios

See [automations/README.md](./automations/README.md) for the full list and what each scenario does.

---

## Airtable Handover Specifics

- The client should be added as an **Owner** on the Airtable base (not just a collaborator)
- They should understand that **Airtable is the database** — the web app reads and writes to it
- Warn them: changing field names or types in Airtable can break the web app
- See [TECHNICAL-OVERVIEW.md](./TECHNICAL-OVERVIEW.md) for the full schema

---

## Support Contacts

Fill in before delivery:

| Role | Name | Contact |
|------|------|---------|
| Developer (you) | | |
| Airtable support | Airtable | support.airtable.com |
| Make.com support | Make | make.com/help |
| Vercel support | Vercel | vercel.com/support |

---

*This plan was created as part of the project handover. See sibling documents for content.*
