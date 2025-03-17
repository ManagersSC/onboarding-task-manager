import { logAuditEvent } from "@/lib/auditLogger"
import logger from "@/lib/logger"
import Airtable from "airtable"
import { cookies } from "next/headers"

export async function GET(request) {
  let userEmail;
  try {
    const cookieStore = await cookies()
    userEmail = await cookieStore.get("user_email")?.value
    if (!userEmail) {
      return Response.json({ 
        error: "Unauthorised",
        userError: "You are unauthorised to access this." 
      }, { status: 401 })
    }

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
      eventStatus: "Errror",
      userIdentifier: userEmail,
      detailedMessage: `Fetching user detail failed, error message: ${error.message}`,
      request
    });
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
