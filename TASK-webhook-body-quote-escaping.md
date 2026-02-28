# TASK: Fix Webhook Body Quote Escaping

**Branch**: `fix/webhook-body-quote-escaping`

**Description**: Sanitize double-quotes in the notification `body` field before sending to the Make.com webhook, preventing invalid JSON in the Slack Block Kit template (module 9 — Create Slack Message).

## Root Cause

`JSON.stringify` correctly encodes quotes at the top-level payload level, but Make.com's `{{1.body}}` variable substitution interpolates the raw string value directly into the Slack Block Kit JSON template. Any `"` in the body breaks the template JSON.

## Sub-tasks

- [x] Replace straight double-quotes with Unicode right single quotation mark (`'`, U+2019) in the webhook payload body field only (`src/lib/notifications.js`)
