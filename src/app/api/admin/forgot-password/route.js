import Airtable from "airtable";
import jwt from "jsonwebtoken";
import logger from "@/lib/utils/logger";
import { logAuditEvent } from "@/lib/auditLogger";
import { escapeAirtableValue } from "@/lib/airtable/sanitize";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID
);

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return Response.json({ error: "Email is required" }, { status: 400 });
    }

    const normalisedEmail = email.trim().toLowerCase();

    // Check Staff table for admin accounts only.
    const admins = await base("Staff")
      .select({
        filterByFormula: `AND({Email}='${escapeAirtableValue(normalisedEmail)}', {IsAdmin}=TRUE())`,
        maxRecords: 1,
      })
      .firstPage();

    if (admins.length === 0) {
      // Generic response to prevent enumeration.
      return Response.json({
        message: "If the email is registered, a password reset email will be sent.",
      });
    }

    if (!process.env.JWT_SECRET) {
      logger.error("JWT_SECRET is not configured");
      return Response.json({ error: "Server configuration error" }, { status: 500 });
    }

    // VULN-H6: Generate unique nonce for single-use token
    const resetNonce = crypto.randomUUID();
    await base("Staff").update([{
      id: admins[0].id,
      fields: { "Reset Nonce": resetNonce },
    }]);

    // userTable encoded in JWT so reset-password queries the correct table.
    const expiryTime = "1h";
    const payload = { email: normalisedEmail, nonce: resetNonce, userTable: "Staff" };
    const resetToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: expiryTime });

    if (!process.env.MAKE_WEBHOOK_URL_RESET_PASSWORD) {
      logger.error("Make.com webhook URL is not configured");
      return Response.json({ error: "Server configuration error" }, { status: 500 });
    }

    try {
      const response = await fetch(process.env.MAKE_WEBHOOK_URL_RESET_PASSWORD, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalisedEmail, expiresIn: expiryTime, resetToken }),
      });

      if (!response.ok) {
        const webhookError = await response.json();
        logger.error("Webhook failed", webhookError);
        await logAuditEvent({
          eventType: "Webhook",
          eventStatus: "Error",
          userIdentifier: normalisedEmail,
          detailedMessage: `Webhook call failed:\n Status: ${response.status}\n Error: ${webhookError}`,
          request,
        });
        return Response.json(
          { error: webhookError.error || "Failed to send password reset email" },
          { status: 500 }
        );
      }
    } catch (err) {
      logger.error("Error triggering Make.com automation", err);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }

    await logAuditEvent({
      eventType: "Forgot Password",
      eventStatus: "Success",
      userIdentifier: normalisedEmail,
      detailedMessage: "Admin password reset email triggered via webhook",
      request,
    });

    return Response.json({
      message: "If the email is registered, a password reset email will be sent.",
    });
  } catch (error) {
    logger.error("Admin Forgot Password Error:", error);
    await logAuditEvent({
      eventType: "Forgot Password",
      eventStatus: "Error",
      userIdentifier: "unknown",
      detailedMessage: error.message,
      request,
    });
    return Response.json({ error: "Server configuration error" }, { status: 500 });
  }
}
