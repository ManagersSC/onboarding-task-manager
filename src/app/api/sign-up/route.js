import Airtable from "airtable";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import logger from "@/lib/logger";
import { logAuditEvent } from "@/lib/auditLogger";

// Sign up route with immediate post sign-up login.
export async function signup(request) {
  try {
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      logger.error("Server configuration error: Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID");
      return Response.json({ error: "Server configuration error" }, { status: 500 });
    }
    
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
      process.env.AIRTABLE_BASE_ID
    );

    // Parse and validate request body.
    const { email, password } = await request.json();
    if (!email || !password) {
      return Response.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Normalize email (trim and lowercase)
    const normalisedEmail = email.trim().toLowerCase();

    // Look up the applicant record in the ATS database.
    const existingApplicants = await base("Applicants")
      .select({ filterByFormula: `{Email}='${normalisedEmail}'`, maxRecords: 1 })
      .firstPage();

    // If no applicant record is found, return a 404.
    if (existingApplicants.length === 0) {
      return Response.json({ error: "Applicant record not found" }, { status: 404 });
    }
    const applicant = existingApplicants[0];

    // If the applicant already has a password (i.e. already registered), return a 400.
    if (applicant.fields && applicant.fields.Password) {
      return Response.json(
        { error: "User already registered. Please log in or reset your password." },
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
    cookieStore.set("user_email", normalisedEmail, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/"
    });

    // Log Success
    await logAuditEvent({
      base,
      eventType: "Sign Up",
      eventStatus: "Success",
      userIdentifier: normalisedEmail,
      detailedMessage: "User signed up and logged in sucessfully",
      request
    });

    return Response.json(
      { message: "User registered successfully", recordId: applicant.id },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Signup Error:", error);
    // Attempt to log failed sign up
    await logAuditEvent({
      base,
      eventType: "Sign Up",
      eventStatus: "Error",
      userIdentifier: normalisedEmail,
      detailedMessage: error.message,
      request
    });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
