// src/app/api/reset-password/route.js
import Airtable from "airtable";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import logger from "@/lib/utils/logger";
import { logAuditEvent } from "@/lib/auditLogger";
import { escapeAirtableValue } from "@/lib/airtable/sanitize";
import { validatePassword } from "@/lib/validation/password";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID
);

export async function POST(request) {
  let email;
  try {
    const { resetToken, newPassword, confirmPassword } = await request.json();

    if (!resetToken || !newPassword || !confirmPassword) {
      return Response.json({ 
        error: "Invalid request",
        userError: "invalid request" 
      }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return Response.json({
        error: "Passwords do not match",
        userError: "Passwords do not match"
      }, { status: 400 });
    }

    // VULN-H5: Enforce password complexity
    const passwordCheck = validatePassword(newPassword);
    if (!passwordCheck.valid) {
      return Response.json({
        error: passwordCheck.message,
        userError: passwordCheck.message
      }, { status: 400 });
    }

    // Ensure JWT_SECRET is set.
    if (!process.env.JWT_SECRET) {
      logger.error("JWT_SECRET is not configured");
      return Response.json({ error: "Server configuration error" }, { status: 500 });
    }

    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch (err) {
      return Response.json({ error: "Invalid or expired token" }, { status: 400 });
    }

    const { email, nonce } = decoded;
    if (!email) {
      return Response.json({ error: "Invalid token payload" }, { status: 400 });
    }

    const users = await base("Applicants")
      .select({ filterByFormula: `{Email}='${escapeAirtableValue(email)}'`, maxRecords: 1 })
      .firstPage();

    if (users.length === 0) {
      return Response.json({ error: "Invalid token or user not found" }, { status: 400 });
    }

    // VULN-H6: Verify nonce matches (single-use token)
    const storedNonce = users[0].fields["Reset Nonce"];
    if (!nonce || !storedNonce || nonce !== storedNonce) {
      return Response.json({ error: "This reset link has already been used" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Clear nonce on use to prevent replay
    await base("Applicants").update([
      {
        id: users[0].id,
        fields: {
          "Password": hashedPassword,
          "Reset Nonce": "",
        }
      }
    ]);

    await logAuditEvent({
      base,
      eventType: "Reset Password",
      eventStatus: "Success",
      userIdentifier: email,
      detailedMessage: "User sucessfully reset password",
      request
    });

    return Response.json({ message: "Password reset successful" });
  } catch (error) {
    logger.error("Reset Password Error:", error);
    await logAuditEvent({
      base,
      eventType: "Reset Password",
      eventStatus: "Error",
      userIdentifier: email,
      detailedMessage: `User password reset error. Error message: ${error}`,
      request
    });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
