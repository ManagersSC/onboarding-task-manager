import Airtable from "airtable";
import jwt from "jsonwebtoken";
import logger from "@/lib/logger";
import { logAuditEvent } from "@/lib/auditLogger";

// Initialize Airtable base.
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID
);

export async function forgotPassword(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return Response.json({ error: "Email is required" }, { status: 400 });
    }

    // Normalise email.
    const normalisedEmail = email.trim().toLowerCase();

    // Check if user exists.
    const users = await base("Applicants")
      .select({ filterByFormula: `{Email}='${normalisedEmail}'`, maxRecords: 1 })
      .firstPage();

    if (users.length === 0) {
      await logAuditEvent({
        eventType: "Forgot Password",
        eventStatus: "Error",
        userIdentifier: normalisedEmail,
        detailedMessage: "User not found",
        request,
      });
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

    // Generate JWT-based reset token (expires in 1 hour).
    const payload = { email: normalisedEmail };
    const tokenOptions = { expiresIn: "1h" };
    const resetToken = jwt.sign(payload, process.env.JWT_SECRET, tokenOptions);

    // Ensure Make.com webhook URL is configured.
    if (!process.env.MAKE_WEBHOOK_URL) {
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
    const webhookResponse = await fetch(process.env.MAKE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalisedEmail, resetToken }),
    });

    if (!webhookResponse.ok) {
      const webhookError = await webhookResponse.text();
      logger.error("Webhook failed", webhookError);
      await logAuditEvent({
        eventType: "Forgot Password Webhook Error",
        eventStatus: "Error",
        userIdentifier: normalisedEmail,
        detailedMessage: `Webhook call failed: ${webhookError}`,
        request,
      });
      return Response.json({ error: "Failed to send password reset email" }, { status: 500 });
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
