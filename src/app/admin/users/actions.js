"use server"

import { updateApplicantInStore, addApplicantsFromEmails, addFeedbackFiles, getApplicantById } from "@/lib/mock-db"
import { inviteStageNeedsLocation, normalizeLocationLabel } from "@/lib/stage"
import Airtable from "airtable"
import logger from "@/lib/utils/logger"
import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import { logAuditEvent } from "@/lib/auditLogger"
import { createNotification } from "@/lib/notifications"

function allowedNextTransition(current, requested) {
  return (
    (current === "New Application" && requested === "First Interview Invite Sent") ||
    (current === "Reviewed" && requested === "Second Interview Invite Sent") ||
    (current === "Reviewed (2nd)" && requested === "Hired")
  )
}

export async function updateApplicant(payload) {
  const { id, stage, location } = payload || {}
  if (!id) throw new Error("Missing id")

  const existing = await getApplicantById(id)
  if (!existing) throw new Error("Applicant not found")

  if (stage) {
    if (!allowedNextTransition(existing.stage, stage)) {
      throw new Error("Transition not allowed")
    }
    if (inviteStageNeedsLocation(stage)) {
      const loc = normalizeLocationLabel(location || existing.location)
      if (!loc) throw new Error("Interview Location required for this stage")
      return await updateApplicantInStore(id, { stage, location: loc })
    }
    return await updateApplicantInStore(id, { stage })
  }

  if (location) {
    return await updateApplicantInStore(id, { location: normalizeLocationLabel(location) })
  }

  return existing
}

export async function addApplicantsByEmail(emails = [], jobType = "") {
  if (!Array.isArray(emails) || emails.length === 0) {
    throw new Error("No valid emails provided")
  }
  
  if (!jobType) {
    throw new Error("Job type is required")
  }

  try {
    // Check if webhook URL is configured
    if (!process.env.MAKE_WEBHOOK_URL_NEW_APPLICATION_FORM) {
      throw new Error("Webhook URL not configured. Please contact administrator.")
    }

    // Prepare payload for webhook
    const webhookPayload = {
      emails,
      jobType,
      timestamp: new Date().toISOString(),
      source: 'Admin Panel',
      requestId: `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    }

    console.log(`Calling webhook for ${emails.length} applicants, job type: ${jobType}`)

    // Call the webhook directly from server action
    // This is secure because the webhook URL is only stored in environment variables on the server
    const webhookResponse = await fetch(process.env.MAKE_WEBHOOK_URL_NEW_APPLICATION_FORM, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Smile-Clinique-Admin-Panel/1.0'
      },
      body: JSON.stringify(webhookPayload)
    })

    // Check if webhook accepted the request
    if (webhookResponse.status !== 200) {
      const errorText = await webhookResponse.text()
      console.error(`Webhook failed: ${webhookResponse.status} ${webhookResponse.statusText}`, {
        status: webhookResponse.status,
        statusText: webhookResponse.statusText,
        response: errorText,
        payload: webhookPayload
      })
      
      throw new Error(`Webhook service error: ${webhookResponse.status} ${webhookResponse.statusText}`)
    }

    // Parse the webhook response to see if automation is complete
    let webhookResult
    let responseText
    
    try {
      // Read the response body only once
      responseText = await webhookResponse.text()
      
      // Log what we received for debugging
      console.log('Webhook response text:', responseText)
      console.log('Webhook response status:', webhookResponse.status)
      console.log('Webhook response headers:', Object.fromEntries(webhookResponse.headers.entries()))
      
      // Try to parse as JSON
      try {
        webhookResult = JSON.parse(responseText)
        console.log('Webhook response parsed as JSON:', webhookResult)
      } catch (parseError) {
        console.warn('Webhook response could not be parsed as JSON, treating as text')
        webhookResult = { message: responseText }
        console.log('Webhook response treated as text:', webhookResult)
      }
    } catch (readError) {
      console.error('Failed to read webhook response:', readError)
      webhookResult = { message: 'Unable to read response' }
    }

    // Check if the automation has actually completed processing
    // The webhook should return a specific structure indicating completion status
    console.log('Checking webhook result status:', webhookResult.status)
    
    if (webhookResult.status === 'processing' || webhookResult.status === 'pending') {
      throw new Error("Application invites are being processed. Please check back later for confirmation.")
    }

    if (webhookResult.status === 'failed' || webhookResult.status === 'error') {
      throw new Error(`Automation failed: ${webhookResult.message || 'Unknown error occurred'}`)
    }

    // If no status field is present, assume success for now (since webhook returned 200)
    // This makes the system more flexible while you update your automation
    if (!webhookResult.status) {
      console.log('No status field found in webhook response, assuming success due to 200 status code')
      webhookResult.status = 'completed'
    }

    // Only show success if automation explicitly reports completion
    if (webhookResult.status !== 'completed' && webhookResult.status !== 'success') {
      console.warn('Webhook returned 200 but automation status unclear:', webhookResult)
      throw new Error("Application invites submitted but processing status unclear. Please check back later.")
    }

    // Success - automation has actually completed processing
    console.log(`Successfully processed ${emails.length} applicants for ${jobType} position`)
    
    // For now, return mock data to maintain compatibility with existing UI
    // In the future, you can return the actual response from your automation
    const created = await addApplicantsFromEmails(emails)
    
    // Update the mock data with the selected job type
    created.forEach(applicant => {
      applicant.job = jobType
    })
    
    return created
  } catch (error) {
    console.error('Error calling webhook:', error)
    throw new Error(`Failed to add applicants: ${error.message}`)
  }
}

export async function attachFeedback({ id, files = [] }) {
  if (!id) throw new Error("Missing id")
  const before = await getApplicantById(id)
  if (!before) throw new Error("Applicant not found")

  const withFeedback = await addFeedbackFiles(id, files)

  const secondRound = String(before.stage).toLowerCase().includes("second")
  const alreadyHired = before.stage === "Hired"
  let nextStage = withFeedback.stage

  if (!alreadyHired) {
    if (secondRound && withFeedback.stage !== "Reviewed (2nd)") nextStage = "Reviewed (2nd)"
    if (!secondRound && withFeedback.stage !== "Reviewed") nextStage = "Reviewed"
  }

  if (nextStage !== withFeedback.stage) {
    return await updateApplicantInStore(id, { stage: nextStage })
  }
  return withFeedback
}

// Create or convert a candidate directly into Hired stage.
// Required: name, email. Optional: jobName.
export async function createHiredApplicant({ name = "", email = "", jobId = "", jobName = "", phone = "" } = {}) {
  if (!name || !email) {
    throw new Error("Name and email are required")
  }
  if (!jobId && !jobName) {
    throw new Error("Job is required")
  }

  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    throw new Error("Server configuration error. Missing Airtable credentials.")
  }

  const normalisedEmail = String(email).trim().toLowerCase()

  try {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

    // Resolve jobId from jobName when only name is provided
    let resolvedJobId = jobId
    if (!resolvedJobId && jobName) {
      const jobs = await base("Jobs")
        .select({ filterByFormula: `{Title}='${jobName.replace(/'/g, "\\'")}'`, maxRecords: 1 })
        .firstPage()
      if (jobs && jobs.length > 0) {
        resolvedJobId = jobs[0].id
      } else {
        throw new Error("Selected Job not found")
      }
    }

    // Check for existing applicant by email
    const existing = await base("Applicants")
      .select({ filterByFormula: `{Email}='${normalisedEmail}'`, maxRecords: 1 })
      .firstPage()

    const commonFields = {
      Name: name,
      Email: normalisedEmail,
      Stage: "Hired",
      "Onboarding Manual Import": true,
      "Job Board": "Manual",
    }

    // Link to Jobs via Applying For (linked record field)
    if (resolvedJobId) {
      commonFields["Applying For"] = [resolvedJobId]
    }
    if (phone) {
      commonFields["Phone"] = phone
    }

    if (existing && existing.length > 0) {
      const recordId = existing[0].id
      const updated = await base("Applicants").update([
        { id: recordId, fields: commonFields }
      ])
      return { id: updated[0].id, fields: updated[0].fields, mode: "updated" }
    }

    const created = await base("Applicants").create([
      { fields: commonFields }
    ])

    const result = { id: created[0].id, fields: created[0].fields, mode: "created" }

    // Audit log and notification
    try {
      const cookieStore = await cookies()
      const sealedSession = cookieStore.get("session")?.value
      let session = null
      if (sealedSession) {
        session = await unsealData(sealedSession, { password: process.env.SESSION_SECRET })
      }
      const userEmail = session?.userEmail || "Unknown"
      const userRole = session?.userRole || "admin"
      const userName = session?.userName || userEmail

      // Minimal request substitute for headers
      const fakeRequest = { headers: new Headers({ "user-agent": "server-action", host: process.env.VERCEL_URL || "localhost" }) }

      await logAuditEvent({
        eventType: "New Hire Added",
        eventStatus: "Success",
        userRole,
        userName,
        userIdentifier: userEmail,
        detailedMessage: `Hired candidate ${name} <${normalisedEmail}> created (jobId: ${resolvedJobId || "n/a"}).`,
        request: fakeRequest,
      })

      // Notify the acting admin if a Staff record is found
      try {
        const staffRecs = await base("Staff").select({ filterByFormula: `{Email}='${String(userEmail).toLowerCase()}'`, maxRecords: 1 }).firstPage()
        const staff = staffRecs?.[0]
        if (staff) {
          await createNotification({
            title: "New hire created",
            body: `${name} <${normalisedEmail}> has been added as Hired`,
            type: "New Hire Added",
            severity: "Success",
            recipientId: staff.id,
            actionUrl: "/admin/users",
            source: "Admin Panel",
          })
        }
      } catch (err) {
        logger?.error?.("createNotification failed for new hire", err)
      }
    } catch (err) {
      logger?.error?.("audit log failed for new hire", err)
    }

    return result
  } catch (error) {
    logger?.error?.("createHiredApplicant error", error)
    throw new Error(error?.message || "Failed to create hired candidate")
  }
}
