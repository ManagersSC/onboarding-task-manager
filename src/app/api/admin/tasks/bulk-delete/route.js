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
      logger.debug("API BULK DELETE TASKS: No session cookie")
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

    const { taskIds, testMode = false } = await request.json()
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return Response.json({ error: "Invalid request: taskIds is required" }, { status: 400 })
    }

    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      logger.error("Server configuration error: Missing Airtable credentials")
      return Response.json({ error: "Server configuration error" }, { status: 500 })
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
      .base(process.env.AIRTABLE_BASE_ID)

    const deletedIds = []
    const failedIds = []
    
    // Get task details for audit logging
    const taskDetails = []
    for (const id of taskIds) {
      try {
        const record = await base('Onboarding Tasks').find(id)
        taskDetails.push({
          id,
          title: record.get('Task') || 'Unknown',
          description: record.get('Task Body') || 'Unknown'
        })
      } catch (err) {
        logger.warn(`Could not fetch details for task ${id}:`, err)
        taskDetails.push({ id, title: 'Unknown', description: 'Unknown' })
      }
    }

    // Delete tasks (or simulate in test mode)
    for (const id of taskIds) {
      try {
        if (testMode) {
          // In test mode, just simulate the deletion
          logger.info(`TEST MODE: Would delete task: ${id}`)
          deletedIds.push(id)
        } else {
          // Actually delete the task
          await base('Onboarding Tasks').destroy(id)
          deletedIds.push(id)
          logger.info(`Successfully deleted task: ${id}`)
        }
      } catch (err) {
        logger.error(`Error deleting task ${id}:`, err)
        failedIds.push(id)
      }
    }

    // Log audit event (only for real deletions, not test mode)
    if (!testMode) {
      const deletedTitles = taskDetails
        .filter(detail => deletedIds.includes(detail.id))
        .map(detail => `${detail.title} (${detail.description})`)
        .join(', ')

      logAuditEvent({
        eventType: "Bulk Task Deletion",
        eventStatus: failedIds.length === 0 ? "Success" : "Partial Success",
        userRole,
        userName,
        userIdentifier: userEmail,
        detailedMessage: `Deleted ${deletedIds.length} tasks: ${deletedTitles}${failedIds.length ? `, ${failedIds.length} failed` : ""}`,
        request,
      })
    } else {
      logger.info(`TEST MODE: Bulk delete simulation completed for ${deletedIds.length} tasks`)
    }

    return Response.json({
      success: true,
      message: testMode 
        ? `TEST MODE: Would delete ${deletedIds.length} tasks${failedIds.length ? `, ${failedIds.length} would fail` : ""}`
        : `${deletedIds.length} tasks deleted successfully${failedIds.length ? `, ${failedIds.length} failed` : ""}`,
      deletedIds,
      failedIds,
      deletedCount: deletedIds.length,
      failedCount: failedIds.length,
      testMode
    })

  } catch (error) {
    logger.error("Error in bulk delete tasks:", error)
    logAuditEvent({
      eventType: "Bulk Task Deletion",
      eventStatus: "Error",
      userRole: userRole || "Unknown",
      userName: userName || "Unknown",
      userIdentifier: userEmail,
      detailedMessage: `Error deleting tasks: ${error.message}`,
      request,
    })
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
