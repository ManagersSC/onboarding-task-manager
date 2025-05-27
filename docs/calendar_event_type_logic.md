# Calendar Event Type Logic & Google Meet Integration

## Overview
This document describes the business logic for event types, attendee requirements, and Google Meet link creation in the onboarding task manager's calendar system. It covers both frontend and backend rules as of the latest update.

---

## Event Types & Their Behaviors

| Event Type   | Attendees Required? | Google Meet Link?         |
|--------------|--------------------|---------------------------|
| Meeting      | Yes (at least one) | Always (toggle ON, locked)|
| Appointment  | Yes (at least one) | Default ON (toggle ON, locked) |
| Event        | Optional           | Optional (toggle, default OFF) |
| Deadline     | No                 | Never                     |
| Other        | Optional           | Never                     |

---

## Frontend Logic
- **Attendees**
  - Required for "Meeting" and "Appointment" (Save disabled if missing).
  - Optional for other types.
- **Google Meet Link Toggle**
  - Always ON and disabled for "Meeting" and "Appointment" (Meet link will be created).
  - Shown and enabled for "Event" (default OFF).
  - Hidden for "Deadline" and "Other".
- **User Feedback**
  - Red asterisk and warning if attendee requirement not met.
  - Note shown if a Meet link will be created.

---

## Backend Logic
- **Attendee Validation**
  - For event types "meeting" and "appointment", at least one attendee is required. If not present, returns 400 error.
- **Google Meet Link Creation**
  - If `createMeet` is true (sent from frontend), a Google Meet link is requested via Google Calendar API (`conferenceData` and `conferenceDataVersion: 1`).
  - For "Meeting" and "Appointment", `createMeet` is always true.
  - For "Event", `createMeet` is set by the user (toggle).
- **Attendee Invitations**
  - If attendees are present, `sendUpdates: 'all'` is sent to Google API so all attendees receive invites/updates.

---

## Extending/Customizing
- To change which event types require attendees or get Meet links, update the logic in both the frontend form and backend API (`route.js`).
- To add more event types, update the event type list and logic tables above.

---

## Example API Payloads

**Create a Meeting:**
```json
{
  "summary": "Team Sync",
  "type": "meeting",
  "attendees": [{ "email": "person@example.com" }],
  "start": { "dateTime": "...", "timeZone": "Europe/London" },
  "end": { "dateTime": "...", "timeZone": "Europe/London" },
  "createMeet": true
}
```

**Create an Event (no Meet link):**
```json
{
  "summary": "Office Party",
  "type": "event",
  "attendees": [],
  "start": { "dateTime": "...", "timeZone": "Europe/London" },
  "end": { "dateTime": "...", "timeZone": "Europe/London" },
  "createMeet": false
}
```

---

## References
- [Google Calendar API: Creating Events with Conference Data](https://developers.google.com/calendar/api/guides/create-events#add_conferencing)
- [Google Calendar API: Sending Updates to Attendees](https://developers.google.com/calendar/api/guides/attend-events#send_updates) 