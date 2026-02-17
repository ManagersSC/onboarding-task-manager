import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import logger from "@/lib/utils/logger"
import { logAuditEvent } from "@/lib/auditLogger"

export async function DELETE(request) {
  let userEmail, userRole, userName

  try {
    // Authentication check
    const sessionCookie = (await cookies()).get("session")?.value
    if (!sessionCookie) {
      logger.debug("API BULK DELETE APPLICANTS: No session cookie")
      return Response.json({ error: "Unauthorised" }, { status: 401 })
    }

    let session
    try {
      session = await unsealData(sessionCookie, {
        password: process.env.SESSION_SECRET,
        ttl: 60 * 60 * 8,
      })
    } catch (err) {
      logger.debug(`Invalid session: ${err.message}`)
      return Response.json(
        { error: "Invalid Session", details: process.env.NODE_ENV === "development" ? err.message : null },
        { status: 401 }
      )
    }

    if (!session.userEmail) {
      logger.debug("Invalid session format")
      return Response.json({ error: "Invalid session format" }, { status: 401 })
    }

    userRole = session.userRole
    if (userRole !== "admin") {
      return Response.json({ error: "Unauthorised" }, { status: 401 })
    }

    userEmail = session.userEmail
    userName = session.userName

    const { applicantIds } = await request.json()

    // Single source of control for test mode via environment variable
    const testMode = process.env.BULK_DELETE_TEST_MODE === 'true'
    if (!Array.isArray(applicantIds) || applicantIds.length === 0) {
      return Response.json({ error: "Invalid request: applicantIds is required" }, { status: 400 })
    }

    const MAX_BULK_DELETE = 50
    if (applicantIds.length > MAX_BULK_DELETE) {
      return Response.json({ error: `Cannot delete more than ${MAX_BULK_DELETE} records at once` }, { status: 400 })
    }

    const airtableIdPattern = /^rec[a-zA-Z0-9]{14}$/
    const invalidIds = applicantIds.filter(id => !airtableIdPattern.test(id))
    if (invalidIds.length > 0) {
      return Response.json({ error: "Invalid record ID format detected" }, { status: 400 })
    }

    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      logger.error("Server configuration error: Missing Airtable credentials")
      return Response.json({ error: "Server configuration error" }, { status: 500 })
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
      .base(process.env.AIRTABLE_BASE_ID)

    const deletedIds = []
    const failedIds = []
    
    // Get applicant details for audit logging
    const applicantDetails = []
    for (const id of applicantIds) {
      try {
        const record = await base('Applicants').find(id)
        applicantDetails.push({
          id,
          name: record.get('Name') || 'Unknown',
          email: record.get('Email') || 'Unknown'
        })
      } catch (err) {
        logger.warn(`Could not fetch details for applicant ${id}:`, err)
        applicantDetails.push({ id, name: 'Unknown', email: 'Unknown' })
      }
    }

    // Delete applicants (or simulate in test mode)
    for (const id of applicantIds) {
      try {
        if (testMode) {
          // In test mode, just simulate the deletion
          logger.info(`TEST MODE: Would delete applicant: ${id}`)
          deletedIds.push(id)
        } else {
          // Actually delete the applicant
          await base('Applicants').destroy(id)
          deletedIds.push(id)
          logger.info(`Successfully deleted applicant: ${id}`)
        }
      } catch (err) {
        logger.error(`Error deleting applicant ${id}:`, err)
        failedIds.push(id)
      }
    }

    // Log audit event (only for real deletions, not test mode)
    if (!testMode) {
      const deletedNames = applicantDetails
        .filter(detail => deletedIds.includes(detail.id))
        .map(detail => `${detail.name} (${detail.email})`)
        .join(', ')

      logAuditEvent({
        eventType: "Bulk Applicant Deletion",
        eventStatus: failedIds.length === 0 ? "Success" : "Partial Success",
        userRole,
        userName,
        userIdentifier: userEmail,
        detailedMessage: `Deleted ${deletedIds.length} applicants: ${deletedNames}${failedIds.length ? `, ${failedIds.length} failed` : ""}`,
        request,
      })
    } else {
      logger.info(`TEST MODE: Bulk delete simulation completed for ${deletedIds.length} applicants`)
    }

    return Response.json({
      success: true,
      message: testMode 
        ? `TEST MODE: Would delete ${deletedIds.length} applicants${failedIds.length ? `, ${failedIds.length} would fail` : ""}`
        : `${deletedIds.length} applicants deleted successfully${failedIds.length ? `, ${failedIds.length} failed` : ""}`,
      deletedIds,
      failedIds,
      deletedCount: deletedIds.length,
      failedCount: failedIds.length,
      testMode
    })

  } catch (error) {
    logger.error("Error in bulk delete applicants:", error)
    logAuditEvent({
      eventType: "Bulk Applicant Deletion",
      eventStatus: "Error",
      userRole: userRole || "Unknown",
      userName: userName || "Unknown",
      userIdentifier: userEmail,
      detailedMessage: `Error deleting applicants: ${error.message}`,
      request,
    })
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
