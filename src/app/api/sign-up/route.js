import Airtable from "airtable";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { sealData } from "iron-session";
import logger from "@/lib/utils/logger";
import { logAuditEvent } from "@/lib/auditLogger";
import { escapeAirtableValue } from "@/lib/airtable/sanitize";

// Sign up route with immediate post sign-up login.
export async function POST(request) {
  let base;
  let normalisedEmail;
  let userRole = 'user';
  try {
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      logger.error("Server configuration error: Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID");
      return Response.json({ 
        error: "Server configuration error", 
        userError: "Apologies, we are experiencing a internal error. Please try again later.", 
      }, { status: 500 });
    }

    base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
      process.env.AIRTABLE_BASE_ID
    );

    // Parse and validate request body.
    const { email, password, confirmPassword } = await request.json();
    if (!email || !password) {
      return Response.json({ 
        error: "Email and password are required", 
        userError: "Email and password are required", 
      }, { status: 400 });
    }
    if (password !== confirmPassword) {
      return Response.json({ 
        error: "Passwords do not match.", 
        userError: "Passwords do not match.", 
      }, { status: 400 });
    }

    // Normalize email (trim and lowercase)
    normalisedEmail = email.trim().toLowerCase();

    // Look up the applicant record in the ATS database.
    const existingApplicants = await base("Applicants")
      .select({ filterByFormula: `{Email}='${escapeAirtableValue(normalisedEmail)}'`, maxRecords: 1 })
      .firstPage();

    // If no applicant record is found, return a 404.
    if (existingApplicants.length === 0) {
      return Response.json({ 
        error: "No applicant record found",
        userError: "Please use the email you provided during your application."
      }, { status: 404 });
    }
    const applicant = existingApplicants[0];

    // If the applicant already has a password (i.e. already registered), return a 400.
    if (applicant.fields && applicant.fields.Password) {
      return Response.json(
        { 
          error: "User already registered. Please log in or reset your password.", 
          userError: "Already registered. Please log in or reset your password.", 
        },
        { status: 400 }
      );
    }

    // Hash the provided password.
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update the applicant record with the hashed password.
    await base("Applicants").update([
      {
        id: applicant.id,
        fields: { Password: hashedPassword }
      }
    ]);

    // Immediately log in the user by setting a secure cookie.
    const cookieStore = await cookies();
    const sessionData = {
      userEmail: normalisedEmail,
      userRole: 'user'
    }
    const sealedSession = await sealData(sessionData, {
      password: process.env.SESSION_SECRET,
      ttl: 60 * 60 * 8, // 8 hours expiration
    })
    cookieStore.set("session", sealedSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8
    });

    logAuditEvent({
      eventType: "Sign Up",
      eventStatus: "Success",
      userRole,
      userIdentifier: normalisedEmail,
      detailedMessage: `User signed up successfully: ${normalisedEmail}`,
      request
    });

    return Response.json(
      { 
        message: "User registered successfully", 
        recordId: applicant.id,
        
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Signup Error:", error);
    // Attempt to log failed sign up
    await logAuditEvent({
      eventType: "Sign Up",
      eventStatus: "Error",
      userIdentifier: normalisedEmail || "unknown",
      detailedMessage: error.message,
      request
    });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
