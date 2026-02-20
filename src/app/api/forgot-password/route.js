import Airtable from "airtable";
import jwt from "jsonwebtoken";
import logger from "@/lib/utils/logger";
import { logAuditEvent } from "@/lib/auditLogger";
import { escapeAirtableValue } from "@/lib/airtable/sanitize";

// Initialize Airtable base.
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID
);

// src/app/api/forgot-password/route.js
export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return Response.json({ error: "Email is required" }, { status: 400 });
    }

    // Normalise email.
    const normalisedEmail = email.trim().toLowerCase();

    // Check if user exists.
    const users = await base("Applicants")
      .select({ filterByFormula: `{Email}='${escapeAirtableValue(normalisedEmail)}'`, maxRecords: 1 })
      .firstPage();

    if (users.length === 0) {
      // Return generic response to prevent enumeration.
      return Response.json({
        message: "If the email is registered, a password reset email will be sent.",
      });
    }

    // Ensure JWT_SECRET is set.
    if (!process.env.JWT_SECRET) {
      logger.error("JWT_SECRET is not configured");
      return Response.json({ error: "Server configuration error" }, { status: 500 });
    }

    // VULN-H6: Generate unique nonce for single-use token
    const resetNonce = crypto.randomUUID();
    await base("Applicants").update([{
      id: users[0].id,
      fields: { "Reset Nonce": resetNonce }
    }]);

    // Generate JWT-based reset token (expires in 1 hour).
    const expiryTime = "1h";
    const payload = { email: normalisedEmail, nonce: resetNonce };
    const tokenOptions = { expiresIn: expiryTime };
    const resetToken = jwt.sign(payload, process.env.JWT_SECRET, tokenOptions);

    // Ensure Make.com webhook URL is configured.
    if (!process.env.MAKE_WEBHOOK_URL_RESET_PASSWORD) {
      logger.error("Make.com webhook URL is not configured");
      await logAuditEvent({
        eventType: "Server",
        eventStatus: "Error",
        userIdentifier: normalisedEmail,
        detailedMessage: `Webhook call failed: ${webhookError}`,
        request,
      });
      return Response.json({ error: "Server configuration error" }, { status: 500 });
    }

    // Trigger Make.com webhook for email delivery.
    try{
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
          {error: webhookError.error || "Failed to send password reset email"}, 
          { status: 500 }
        );
      }
    } catch(err){
      logger.error("Error triggering Make.com automation", err);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }

    await logAuditEvent({
      eventType: "Forgot Password",
      eventStatus: "Success",
      userIdentifier: normalisedEmail,
      detailedMessage: "Password reset email triggered via webhook",
      request,
    });

    return Response.json({
      message: "If the email is registered, a password reset email will be sent.",
    });
  } catch (error) {
    logger.error("Forgot Password Error:", error);
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
