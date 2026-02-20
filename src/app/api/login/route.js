import { cookies } from "next/headers";
import logger from "@/lib/utils/logger";
import Airtable from "airtable";
import bcrypt from "bcryptjs";
import { sealData } from "iron-session";
import { logAuditEvent } from "@/lib/auditLogger";
import { escapeAirtableValue } from "@/lib/airtable/sanitize";

// Login route
export async function POST(request) {
  let base;
  let normalisedEmail;
  let userRole;
  let userName;

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({
          error: "Email and password is required",
          userError: "Email and password is required",
        }),
        { status: 400 }
      );
    }

    normalisedEmail = email.trim().toLowerCase();

    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      logger.error(
        "Server configuration error: Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID"
      );
      return Response.json(
        {
          error: "Server configuration error",
          userError:
            "Apologies, we are experiencing a internal error. Please try again later.",
        },
        { status: 500 }
      );
    }

    base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
      process.env.AIRTABLE_BASE_ID
    );

    // Fetch user from Airtable
    const users = await base("Applicants")
      .select({
        filterByFormula: `{Email}='${escapeAirtableValue(normalisedEmail)}'`,
        maxRecords: 1,
      })
      .firstPage();

    // VULN-M5+M6: Use identical error messages and constant-time comparison to prevent enumeration/timing attacks
    // Dummy hash for timing-safe comparison when user not found
    const DUMMY_HASH = "$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012";
    const genericError = { error: "Invalid credentials", userError: "Invalid email or password." };

    if (users.length === 0) {
      // Compare against dummy hash to prevent timing attack
      await bcrypt.compare(password, DUMMY_HASH);
      return new Response(JSON.stringify(genericError), { status: 401 });
    }

    const user = users[0];
    const storedHashedPassword = user.fields.Password;

    if (!storedHashedPassword) {
      // Compare against dummy hash to prevent timing attack
      await bcrypt.compare(password, DUMMY_HASH);
      return new Response(JSON.stringify(genericError), { status: 401 });
    }

    // Compare Password
    const isMatch = await bcrypt.compare(password, storedHashedPassword);
    if (!isMatch) {
      return new Response(JSON.stringify(genericError), { status: 401 });
    }

    // Set encrypted session cookie with user role
    const cookieStore = await cookies();
    const sessionData = {
      userEmail: normalisedEmail,
      userRole: 'user',
      userName: user.fields.Name
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

    userRole = sessionData.userRole;
    userName = sessionData.userName || "Unknown";

    logAuditEvent({
      eventType: "Login",
      eventStatus: "Success",
      userRole,
      userName,
      userIdentifier: normalisedEmail,
      detailedMessage: `User login: ${normalisedEmail}`,
      request
    })

    return new Response(JSON.stringify({ 
      message: "Logged in successfully",
      role: "user",
      name: user.fields.Name || "User"
    }));
    
  } catch (error) {
    logger.error("Full Error:", {
      message: error.message,
      stack: error.stack,
    });
    logAuditEvent({
      eventType: "Login",
      eventStatus: "Error",
      userIdentifier: normalisedEmail,
      userRole,
      userName,
      detailedMessage: `Fetching user detail failed, error message: ${error.message}`,
      request,
    });
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      }),
      { status: 500 }
    );
  }
}

export const login = POST;
