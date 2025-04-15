import { cookies } from "next/headers"
import logger from "@/lib/logger"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import { logAuditEvent } from "@/lib/auditLogger"

export async function POST(request) {
  let userEmail
  let userRole
  let userName

  try {
    // Session Cookie
    const sessionCookie = (await cookies()).get("session")?.value
    if (!sessionCookie) {
      logger.debug("API POST CREATE-TASK: No sessionCookie")
      return Response.json({ error: "Unauthorised" }, { status: 401 })
    }

    let session
    try {
      session = await unsealData(sessionCookie, {
        password: process.env.SESSION_SECRET,
        ttl: 60 * 60 * 8,
      })
    } catch (error) {
      logger.debug(`Invalid session: ${error.message}`)
      return Response.json(
        {
          error: "Invalid Session",
          details: process.env.NODE_ENV === "development" ? error.message : null,
        },
        { status: 401 },
      )
    }

    if (!session.userEmail) {
      logger.debug(`Invalid session format`)
      return Response.json({ error: "Invalid session format" }, { status: 401 })
    }

    // Get Role
    userRole = session.userRole
    if (userRole !== "admin") {
      return Response.json({ error: "Unauthorised" }, { status: 401 })
    }

    userEmail = session.userEmail
    userName = session.userName || userEmail.split("@")[0]

    // Parse request body
    const body = await request.json()
    const {
      taskName,
      taskDescription,
      taskFunction, // "Core" or "Custom"
      taskMedium, // "Document" or "Video"
      taskWeek,
      taskDay,
      taskLink,
      assigneeEmails,
    } = body

    if (!taskName) {
      return Response.json({ error: "Task name is required" }, { status: 400 })
    }

    // Airtable setup
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      logger.error("Server configuration error: Missing Airtable credentials")
      return Response.json({ error: "Server configuration error" }, { status: 500 })
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

    // Convert Document to Doc for Airtable
    const taskType = taskMedium === "Document" ? "Doc" : taskMedium

    let taskRecordId = null

    // Only create a record in Onboarding Task table if the task function is Core
    if (taskFunction === "Core") {
      try {
        logger.debug(`${taskName}, ${taskWeek}, ${taskDay}, ${taskLink}, ${taskFunction}`)
        // Create a new record in the Onboarding Task table
        const taskRecord = await base("Onboarding Tasks").create({
          Task: taskName,
          "Task Body": taskDescription || "",
          "Week Number": taskWeek || "",
          "Day Number": taskDay || "",
          Type: taskFunction, // Core
          "Type": taskType, // Doc or Video
          Link: taskLink || "",
        })

        taskRecordId = taskRecord.id
        logger.debug(`Created task record: ${taskRecordId}`)
        logAuditEvent({
            eventType: "Task Created",
            eventStatus: "Success",
            userRole: userRole || "Unknown",
            userName,
            userIdentifier: userEmail,
            detailedMessage: `Admin: ${userName}. Core task created. task record: ${taskRecordId}`,
            request,
        })
      } catch (error) {
        logger.error("Error creating task record:", error)
        logAuditEvent({
            eventType: "Server",
            eventStatus: "Error",
            userRole: userRole || "Unknown",
            userName,
            userIdentifier: userEmail,
            detailedMessage: `Server error whilst creating a core task, error message: ${error.message}`,
            request,
        })
        return Response.json({ error: `Error creating task: ${error.message}` }, { status: 500 })
      }
    }

    // If assignee emails are provided, create records in Onboarding Tasks Logs
    if (assigneeEmails && assigneeEmails.length > 0) {
      const successfulAssignments = []
      const failedAssignments = []

      for (const email of assigneeEmails) {
        try {
          // Find the Applicant record with the matching email
          const applicantRecords = await base("Applicants")
            .select({
              filterByFormula: `{Email} = '${email}'`,
              maxRecords: 1,
            })
            .firstPage()

          if (applicantRecords.length === 0) {
            failedAssignments.push({ email, reason: "Applicant not found" })
            continue
          }

          const applicantRecord = applicantRecords[0]

          // Find the Summary record linked to this Applicant
          const summaryRecords = await base("Summary")
            .select({
              filterByFormula: `SEARCH('${applicantRecord.id}', {Applicant})`,
              maxRecords: 1,
            })
            .firstPage()

          let summaryRecordId = null
          if (summaryRecords.length > 0) {
            summaryRecordId = summaryRecords[0].id
          }

          // Create a record in Onboarding Tasks Logs
          const logRecordData = {
            Status: "Assigned",
            Assigned: [applicantRecord.id],
          }

          // If we have a task record (Core task), link it
          if (taskRecordId) {
            logRecordData["Task"] = [taskRecordId]
          } else if (taskFunction === "Custom") {
            // For Custom tasks, we don't create an Onboarding Task record
            // but we still need to provide task details in the log
            // We can't set these directly, but we can note it in the audit log
            // logRecordData["Task Title"] = taskName
            // logRecordData["Task Desc"] = taskDescription || ""
            // logRecordData["Week Number"] = taskName
            // logRecordData["Task Title"] = taskName
            // logRecordData["Task Title"] = taskName
          }

          // Add Summary if available
          if (summaryRecordId) {
            logRecordData["Summary"] = [summaryRecordId]
          }

          const logRecord = await base("Onboarding Tasks Logs").create(logRecordData)

          logger.debug(`Created task log record: ${logRecord.id}`)
          successfulAssignments.push(email)

          // Log the assignment event
          logAuditEvent({
            eventType: "Task Assigned",
            eventStatus: "Success",
            userRole,
            userName,
            userIdentifier: userEmail,
            detailedMessage: `Admin: ${userName}. ${taskFunction} task created: "${taskName}", Assigned to ${email}`,
            request,
          })
        } catch (error) {
            logger.error(`Error assigning task to ${email}:`, error)
            failedAssignments.push({ email, reason: error.message })
            logAuditEvent({
                eventType: "Server",
                eventStatus: "Error",
                userRole,
                userName,
                userIdentifier: userEmail,
                // Remember to add the failed assignments to the message below
                detailedMessage: `Server error whilst assigning a custom task, error message: ${error.message}.`,
                request,
            })
        }
      }

      // Return results
      return Response.json({
        success: true,
        message: `Task "${taskName}" processed`,
        taskId: taskRecordId,
        successfulAssignments,
        failedAssignments,
      })
    } else if (taskFunction === "Core") {
      return Response.json({
        success: true,
        message: `Core task "${taskName}" created successfully`,
        taskId: taskRecordId,
      })
    } else {
      // Custom tasks require at least one assignee
      return Response.json(
        {
          error: "Custom tasks require at least one assignee email",
        },
        { status: 400 },
      )
    }
  } catch (error) {
    logger.error("Error in create-task API:", error)
    logAuditEvent({
      eventType: "Task Created",
      eventStatus: "Error",
      userRole: userRole || "Unknown",
      userName,
      userIdentifier: userEmail,
      detailedMessage: `Task creation failed: ${error.message}`,
      request,
    })
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
