import logger from "./utils/logger";
import { getAirtableBase } from "./airtable/client";

/**
 * Logs an event to the "Website Audit Log" table in Airtable.
 *
 * @param {object} options - The log event details.
 * @param {string} options.eventType - The type of event, e.g. "Sign Up Success".
 * @param {string} options.eventStatus - The outcome of the event, e.g. "Success" or "Failure".
 * @param {string} options.userRole - The user role (e.g. "admin", "user").
 * @param {string} options.userName - Display name of the user.
 * @param {string} options.userIdentifier - The user email, ID, etc.
 * @param {string} options.detailedMessage - A more verbose description of the event.
 * @param {Request} options.request - The Next.js request object, to extract IP/user agent (optional).
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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/d97e23f0-6cbf-4e5b-b880-d53a90811734',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditLogger.js:entry',message:'logAuditEvent called',data:{eventType,eventStatus,hasRequest:!!request,hasHeaders:!!request?.headers},hypothesisId:'H1_H5',timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  try {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d97e23f0-6cbf-4e5b-b880-d53a90811734',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditLogger.js:beforeGetBase',message:'about to getAirtableBase',data:{eventType},hypothesisId:'H2',timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    const base = getAirtableBase();

    // Defensive: request may be missing in some call paths (e.g. server actions use a fake request)
    const headers = request?.headers;
    const getHeader = headers?.get?.bind(headers) ?? (() => null);
    const ipAddress = getHeader("x-forwarded-for") || getHeader("host") || "unknown";
    const userAgent = getHeader("user-agent") || "unknown";

    if (userRole === "admin") userRole = "Admin";
    else if (userRole === "user") userRole = "User";
    else userRole = "Unknown";

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d97e23f0-6cbf-4e5b-b880-d53a90811734',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditLogger.js:beforeCreate',message:'about to base(Website Audit Log).create',data:{eventType},hypothesisId:'H3_H5',timestamp:Date.now()})}).catch(()=>{});
    // #endregion
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d97e23f0-6cbf-4e5b-b880-d53a90811734',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditLogger.js:afterCreate',message:'create succeeded',data:{eventType},hypothesisId:'H5',timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d97e23f0-6cbf-4e5b-b880-d53a90811734',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditLogger.js:catch',message:'audit create failed',data:{eventType,errorMessage:error?.message,errorName:error?.name},hypothesisId:'H2_H3_H4_H5',timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    logger.error("Audit log creation failed:", error);
  }
}
