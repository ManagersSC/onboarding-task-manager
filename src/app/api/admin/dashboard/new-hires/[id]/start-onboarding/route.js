import { cookies } from "next/headers"
import logger from "@/lib/utils/logger"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import { logAuditEvent } from "@/lib/auditLogger"

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

export async function POST(request, { params }) {
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
    const { onboardingStartDate, triggerAutomation = true } = body

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

    // 4. Airtable setup
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      logger.error("Server configuration error: Missing Airtable credentials")
      return Response.json({ error: "Server configuration error" }, { status: 500 })
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

    // 5. Get applicant record
    const applicantId = params.id
    let applicantRecord
    try {
      applicantRecord = await base("Applicants").find(applicantId)
    } catch (error) {
      logger.error(`Applicant record not found: ${applicantId}`)
      return Response.json({ error: "Applicant not found" }, { status: 404 })
    }

    const applicantName = applicantRecord.fields["Name"] || "Unknown"
    const applicantEmail = applicantRecord.fields["Email"] || ""

    // 6. Update Airtable fields
    const fieldsToUpdate = {
      "Onboarding Start Date": validatedDate,
      "Onboarding Started": true,
      "Onboarding Initiation Flow": true
    }

    const updatedRecord = await base("Applicants").update([
      {
        id: applicantId,
        fields: fieldsToUpdate
      }
    ])

    // 7. Send webhook to make.com if automation is triggered
    if (triggerAutomation && process.env.MAKE_WEBHOOK_URL_TASK_ASSIGNMENT) {
      try {
        // Get calculated week and day values
        const week = updatedRecord[0].fields["Onboarding Week"] || 1
        const day = updatedRecord[0].fields["Onboarding Week Day"] || 1

        const webhookPayload = {
          action: "initiate",
          id: applicantId,
          name: applicantName,
          email: applicantEmail,
          week: week,
          day: day
        }

        logger.debug(`Sending webhook payload: ${JSON.stringify(webhookPayload)}`)

        const webhookResponse = await fetch(process.env.MAKE_WEBHOOK_URL_TASK_ASSIGNMENT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(webhookPayload)
        })

        if (!webhookResponse.ok) {
          const errorText = await webhookResponse.text()
          logger.error(`Webhook failed: ${webhookResponse.status} - ${errorText}`)
          throw new Error(`Webhook failed: ${webhookResponse.statusText}`)
        }

        logger.info("Webhook sent successfully to make.com")
      } catch (webhookError) {
        logger.error("Failed to send webhook:", webhookError)
        // Don't fail the entire request if webhook fails, but log it
        await logAuditEvent({
          eventType: "Onboarding Webhook Error",
          eventStatus: "Error",
          userRole: userRole,
          userName: userName,
          userIdentifier: userEmail,
          detailedMessage: `Webhook failed for applicant ${applicantName}: ${webhookError.message}`,
          request
        })
      }
    }

    // 8. Log successful onboarding start
    await logAuditEvent({
      eventType: "Onboarding Start Date Set",
      eventStatus: "Success",
      userRole: userRole,
      userName: userName,
      userIdentifier: userEmail,
      detailedMessage: `Admin ${userName} set onboarding start date to ${validatedDate} for applicant ${applicantName}`,
      request
    })

    // 9. Return success response
    return Response.json({
      success: true,
      message: "Onboarding started successfully",
      record: {
        id: applicantId,
        onboardingStartDate: validatedDate,
        onboardingStarted: true,
        onboardingInitiationFlow: true
      }
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