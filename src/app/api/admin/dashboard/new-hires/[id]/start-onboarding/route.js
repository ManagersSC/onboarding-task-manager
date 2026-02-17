import { cookies } from "next/headers"
import logger from "@/lib/utils/logger"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import { logAuditEvent } from "@/lib/auditLogger"
import { revalidateTag } from "next/cache"

// Date validation helper
const validateStartDate = (dateString) => {
  const startDate = new Date(dateString)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  if (startDate < today) {
    throw new Error("Onboarding start date cannot be in the past")
  }
  
  return startDate.toISOString().split('T')[0] // Return YYYY-MM-DD format
}

export async function POST(request, props) {
  const { id: applicantId } = await props.params
  let userEmail, userRole, userName

  try {
    // 1. Session validation and admin check
    const sessionCookie = (await cookies()).get("session")?.value
    if (!sessionCookie) {
      logger.debug("API POST START-ONBOARDING: No session cookie")
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
        { error: "Invalid Session", details: process.env.NODE_ENV === "development" ? error.message : null },
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

    // 2. Parse request body
    const body = await request.json()
    const { onboardingStartDate } = body

    if (!onboardingStartDate) {
      return Response.json({ error: "Onboarding start date is required" }, { status: 400 })
    }

    // 3. Validate start date
    let validatedDate
    try {
      validatedDate = validateStartDate(onboardingStartDate)
    } catch (error) {
      return Response.json({ error: error.message }, { status: 400 })
    }

    // 4. Check if start date is today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const startDate = new Date(validatedDate)
    startDate.setHours(0, 0, 0, 0)
    const isToday = startDate.getTime() === today.getTime()

    // 5. Airtable setup
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      logger.error("Server configuration error: Missing Airtable credentials")
      return Response.json({ error: "Server configuration error" }, { status: 500 })
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

    // 6. Get applicant record
    let applicantRecord
    try {
      applicantRecord = await base("Applicants").find(applicantId)
    } catch (error) {
      logger.error(`Applicant record not found: ${applicantId}`)
      return Response.json({ error: "Applicant not found" }, { status: 404 })
    }

    const applicantName = applicantRecord.fields["Name"] || "Unknown"
    const applicantEmail = applicantRecord.fields["Email"] || ""
    const jobID = applicantRecord.fields["Applying For"] || ""

    // 7. Update Airtable fields
    const fieldsToUpdate = {
      "Onboarding Start Date": validatedDate,
      "Onboarding Initiation Flow": true,
      ...(isToday && { "Onboarding Started": true })
    }

    const updatedRecord = await base("Applicants").update([
      {
        id: applicantId,
        fields: fieldsToUpdate
      }
    ])

    try {
      revalidateTag("dashboard:new-hires")
      revalidateTag("admin:overview")
    } catch {}

    // 8. Send webhook(s)
    // - Task assignment: only when the start date is today
    if (isToday) {
      try {
        if (process.env.MAKE_WEBHOOK_URL_TASK_ASSIGNMENT) {
          const taskAssignmentPayload = {
            action: "initiate",
            id: applicantId,
            name: applicantName,
            email: applicantEmail,
            jobID: jobID,
            startDate: validatedDate
          }

          logger.debug(`Sending task assignment webhook payload: ${JSON.stringify(taskAssignmentPayload)}`)

          const taskAssignmentResponse = await fetch(process.env.MAKE_WEBHOOK_URL_TASK_ASSIGNMENT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(taskAssignmentPayload)
          })

          if (!taskAssignmentResponse.ok) {
            const errorText = await taskAssignmentResponse.text()
            logger.error(`Task assignment webhook failed: ${taskAssignmentResponse.status} - ${errorText}`)
            throw new Error(`Task assignment webhook failed: ${taskAssignmentResponse.statusText}`)
          }

          logger.info("Task assignment webhook sent successfully to make.com")
        }
      } catch (webhookError) {
        logger.error("Failed to send task assignment webhook:", webhookError)
        await logAuditEvent({
          eventType: "Webhook",
          eventStatus: "Error",
          userRole: userRole,
          userName: userName,
          userIdentifier: userEmail,
          detailedMessage: `Task assignment webhook failed for applicant ${applicantName}: ${webhookError.message}`,
          request
        })
      }
    }

    // - Onboarding notification: always send regardless of start date
    try {
      if (process.env.MAKE_WEBHOOK_URL_ONBOARDING_NOTIFICATION) {
        const notificationPayload = {
          name: applicantName,
          recordID: applicantId
        }

        logger.debug(`Sending onboarding notification webhook payload: ${JSON.stringify(notificationPayload)}`)

        const notificationResponse = await fetch(process.env.MAKE_WEBHOOK_URL_ONBOARDING_NOTIFICATION, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(notificationPayload)
        })

        if (!notificationResponse.ok) {
          const errorText = await notificationResponse.text()
          logger.error(`Onboarding notification webhook failed: ${notificationResponse.status} - ${errorText}`)
          throw new Error(`Onboarding notification webhook failed: ${notificationResponse.statusText}`)
        }

        logger.info("Onboarding notification webhook sent successfully to make.com")
      }
    } catch (webhookError) {
      logger.error("Failed to send onboarding notification webhook:", webhookError)
      await logAuditEvent({
        eventType: "Webhook",
        eventStatus: "Error",
        userRole: userRole,
        userName: userName,
        userIdentifier: userEmail,
        detailedMessage: `Onboarding notification webhook failed for applicant ${applicantName}: ${webhookError.message}`,
        request
      })
    }

    // 9. Log successful onboarding start
    await logAuditEvent({
      eventType: "Onboarding Start Date Set",
      eventStatus: "Success",
      userRole: userRole,
      userName: userName,
      userIdentifier: userEmail,
      detailedMessage: `Admin ${userName} set onboarding start date to ${validatedDate} for applicant ${applicantName}`,
      request
    })

    // 10. Return success response
    return Response.json({
      success: true,
      message: isToday 
        ? "Onboarding started successfully and tasks assigned!" 
        : `Onboarding scheduled for ${validatedDate}. Tasks will be assigned on start date.`,
      record: {
        id: applicantId,
        onboardingStartDate: validatedDate,
        onboardingStarted: isToday,
        onboardingInitiationFlow: true
      },
      webhookSent: isToday
    })

  } catch (error) {
    logger.error("Error setting onboarding start date:", error)
    
    await logAuditEvent({
      eventType: "Onboarding Start Date Set",
      eventStatus: "Error",
      userRole: userRole || "Unknown",
      userName: userName || "Unknown",
      userIdentifier: userEmail || "Unknown",
      detailedMessage: `Error setting onboarding start date: ${error.message}`,
      request
    })

    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
} 