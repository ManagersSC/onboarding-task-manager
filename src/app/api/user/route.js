import { logAuditEvent } from "@/lib/auditLogger"
import logger from "@/lib/logger"
import Airtable from "airtable"
import { cookies } from "next/headers"
import { unsealData } from "iron-session"

export async function GET(request) {
  let userEmail;
  let userRole;
  let userName;
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("session")?.value
    if (!sessionCookie) {
      return Response.json({ 
        error: "Unauthorised",
        userError: "You are unauthorised to access this." 
      }, { status: 401 })
    }
    let session;
    try{
      session = await unsealData(sessionCookie, {
        password: process.env.SESSION_SECRET,
        ttl: 60 * 60 * 8,
      });
    } catch (error) {
      logger.debug(`Invalid session: ${error.message}`)
      return Response.json({ 
        error: "invalid Session",
        details: process.env.NODE_ENV === "development" ? error.message : null
      }, { status: 401 });
    }

    userEmail = session.userEmail;
    userRole = session.userRole;
    userName = session.userName;

    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      logger.error("Server configuration error: Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID");
      return Response.json({ 
        error: "Server configuration error", 
        userError: "Apologies, we are experiencing a internal error. Please try again later.", 
      }, { status: 500 });
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)
    const records = await base("Applicants").select({
      filterByFormula: `{Email}='${userEmail}'`,
      maxRecords: 1
    }).firstPage()

    if (!records || records.length === 0) {
      return Response.json({ 
        error: "User not found",
        userError: `Apologies, there was no user found for this email: ${userEmail}`
    }, { status: 404 })
    }

    const userRecord = records[0]
    // Return the user’s name, email, etc. (excluding sensitive data like password)
    const name = userRecord.fields["Name"] || "Unknown";
    const job = userRecord.fields["Job Name"] || "Unknown";
    return Response.json({
      email: userEmail,
      name,
      job
    })
  } catch (error) {
    logger.error("GET /api/user error:", error);
    logAuditEvent({
      eventType: "User",
      eventStatus: "Error",
      userIdentifier: userEmail,
      userRole,
      userName,
      detailedMessage: `Fetching user detail failed, error message: ${error.message}`,
      request
    });
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
