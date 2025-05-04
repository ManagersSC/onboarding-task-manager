import Airtable from "airtable";
import logger from "./utils/logger";
import { cookies } from "next/headers";
import { unsealData } from "iron-session";

// Initialize Airtable connection
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID
);

/**
 * Logs an event to the "Website Audit Log" table in Airtable.
 *
 * @param {object} options - The log event details.
 * @param {string} options.eventType - The type of event, e.g. "Sign Up Success".
 * @param {string} options.eventStatus - The outcome of the event, e.g. "Success" or "Failure".
 * @param {string} options.userIdentifier - The user email, ID, etc.
 * @param {string} options.detailedMessage - A more verbose description of the event.
 * @param {Request} options.request - The Next.js request object, to extract IP/user agent.
 */
export async function logAuditEvent({
  eventType,
  eventStatus,
  userRole,
  userName,
  userIdentifier,
  detailedMessage,
  request
}) {
  try {
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      throw new Error("Airtable environment variables are missing");
    }

    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("host") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    if(userRole === "admin") { userRole = "Admin"} 
    else if (userRole === "user"){ userRole = "User" }
    else { userRole = "Unknown"}

    // Create a record in Airtable
    await base("Website Audit Log").create([
      {
        fields: {
          "Timestamp": new Date().toISOString(),
          "Event Type": eventType,
          "Event Status": eventStatus,
          "Role": userRole,
          "Name": userName || "Unknown",
          "User Identifier": userIdentifier || "unknown",
          "Detailed Message": detailedMessage || "No details provided",
          "IP Address": ipAddress,
          "User Agent": userAgent
        }
      }
    ]);
  } catch (error) {
    logger.error("Audit log creation failed:", error);
  }
}
