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
    (current === "Under Review" && requested === "Second Interview Invite Sent") ||
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

    // Append to Stage History JSON (do not overwrite existing)
    const nowIso = new Date().toISOString()
    let history = []
    try {
      if (Array.isArray(existing.stageHistory)) history = [...existing.stageHistory]
      else if (typeof existing.stageHistory === "string" && existing.stageHistory.trim()) {
        history = JSON.parse(existing.stageHistory)
      }
    } catch {}
    history.push({ stage, at: nowIso })

    let result
    if (inviteStageNeedsLocation(stage)) {
      const loc = normalizeLocationLabel(location || existing.location)
      if (!loc) throw new Error("Interview Location required for this stage")
      result = await updateApplicantInStore(id, { stage, location: loc, stageHistory: history })
    } else {
      result = await updateApplicantInStore(id, { stage, stageHistory: history })
    }
    // Audit log
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
      const fakeRequest = { headers: new Headers({ "user-agent": "server-action", host: process.env.VERCEL_URL || "localhost" }) }
      await logAuditEvent({
        eventType: "Applicant Stage Update",
        eventStatus: "Success",
        userRole,
        userName,
        userIdentifier: userEmail,
        detailedMessage: `Stage change via server action: ${existing.stage || "—"} → ${stage} for applicant ${id}${result?.location ? ` • Location: ${result.location}` : ""}`,
        request: fakeRequest,
      })
    } catch (err) {
      logger?.error?.("audit log failed for updateApplicant", err)
    }
    return result
  }

  if (location) {
    const updated = await updateApplicantInStore(id, { location: normalizeLocationLabel(location) })
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
      const fakeRequest = { headers: new Headers({ "user-agent": "server-action", host: process.env.VERCEL_URL || "localhost" }) }
      await logAuditEvent({
        eventType: "Applicant Location Update",
        eventStatus: "Success",
        userRole,
        userName,
        userIdentifier: userEmail,
        detailedMessage: `Location updated to ${updated?.location || "Unknown"} for applicant ${id}`,
        request: fakeRequest,
      })
    } catch (err) {
      logger?.error?.("audit log failed for location update", err)
    }
    return updated
  }

  return existing
}

export async function addApplicantsByEmail(emails = [], jobId = "") {
  if (!Array.isArray(emails) || emails.length === 0) {
    throw new Error("No valid emails provided")
  }
  
  if (!jobId) {
    throw new Error("Job id is required")
  }

  try {
    // Check if webhook URL is configured
    if (!process.env.MAKE_WEBHOOK_URL_NEW_APPLICATION_FORM) {
      throw new Error("Webhook URL not configured. Please contact administrator.")
    }

    // Prepare payload for webhook
    const webhookPayload = {
      emails,
      jobId,
      timestamp: new Date().toISOString(),
      source: 'Admin Panel',
      requestId: `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    }

    console.log(`Calling webhook for ${emails.length} applicants, job id: ${jobId}`)

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
    console.log(`Successfully processed ${emails.length} applicants for jobId=${jobId}`)
    
    // For now, return mock data to maintain compatibility with existing UI
    // In the future, you can return the actual response from your automation
    const created = await addApplicantsFromEmails(emails)
    
    // Update the mock data with the selected job id
    created.forEach(applicant => {
      applicant.job = jobId
    })

    // Audit log success
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
      const fakeRequest = { headers: new Headers({ "user-agent": "server-action", host: process.env.VERCEL_URL || "localhost" }) }
      await logAuditEvent({
        eventType: "Applicant Invites Submitted",
        eventStatus: "Success",
        userRole,
        userName,
        userIdentifier: userEmail,
        detailedMessage: `Invites submitted for ${emails.length} applicant(s); jobId=${jobId}; webhookStatus=${webhookResult.status}; requestId=${webhookPayload.requestId}`,
        request: fakeRequest,
      })
    } catch (err) {
      logger?.error?.("audit log failed for addApplicantsByEmail success", err)
    }

    return created
  } catch (error) {
    console.error('Error calling webhook:', error)
    // Audit log failure
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
      const fakeRequest = { headers: new Headers({ "user-agent": "server-action", host: process.env.VERCEL_URL || "localhost" }) }
      await logAuditEvent({
        eventType: "Applicant Invites Submitted",
        eventStatus: "Failure",
        userRole,
        userName,
        userIdentifier: userEmail,
        detailedMessage: `Invites failed for ${emails.length} applicant(s); jobId=${jobId}; error=${error?.message || "Unknown"}`,
        request: fakeRequest,
      })
    } catch (err) {
      logger?.error?.("audit log failed for addApplicantsByEmail failure", err)
    }
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
    // Append to Stage History JSON
    const nowIso = new Date().toISOString()
    let history = []
    try {
      if (Array.isArray(before.stageHistory)) history = [...before.stageHistory]
      else if (typeof before.stageHistory === "string" && before.stageHistory.trim()) {
        history = JSON.parse(before.stageHistory)
      }
    } catch {}
    history.push({ stage: nextStage, at: nowIso })

    const updated = await updateApplicantInStore(id, { stage: nextStage, stageHistory: history })
    // Audit for feedback + stage update
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
      const fakeRequest = { headers: new Headers({ "user-agent": "server-action", host: process.env.VERCEL_URL || "localhost" }) }
      await logAuditEvent({
        eventType: "Interview Feedback Upload",
        eventStatus: "Success",
        userRole,
        userName,
        userIdentifier: userEmail,
        detailedMessage: `Feedback files attached (${files?.length || 0} file(s)); stage advanced ${before.stage || "—"} → ${nextStage} for applicant ${id}`,
        request: fakeRequest,
      })
    } catch (err) {
      logger?.error?.("audit log failed for feedback attach", err)
    }
    return updated
  }
  // Audit for feedback only (no stage change)
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
    const fakeRequest = { headers: new Headers({ "user-agent": "server-action", host: process.env.VERCEL_URL || "localhost" }) }
    await logAuditEvent({
      eventType: "Interview Feedback Upload",
      eventStatus: "Success",
      userRole,
      userName,
      userIdentifier: userEmail,
      detailedMessage: `Feedback files attached (${files?.length || 0} file(s)); stage unchanged (${withFeedback.stage}) for applicant ${id}`,
      request: fakeRequest,
    })
  } catch (err) {
    logger?.error?.("audit log failed for feedback attach (no stage change)", err)
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
      .select({
        filterByFormula: `LOWER({Email})='${normalisedEmail.replace(/'/g, "\\'")}'`,
        maxRecords: 1
      })
      .firstPage()

    // Build stage history with appended Hired stage
    const nowIso = new Date().toISOString()
    let stageHistoryArr = []
    if (existing && existing.length > 0) {
      try {
        const prevHistory = existing[0].get("Stage History")
        if (Array.isArray(prevHistory)) {
          stageHistoryArr = [...prevHistory]
        } else if (typeof prevHistory === "string" && prevHistory.trim()) {
          stageHistoryArr = JSON.parse(prevHistory)
        }
      } catch {}
    }
    stageHistoryArr.push({ stage: "Hired", at: nowIso })

    const commonFields = {
      Name: name,
      Email: normalisedEmail,
      Stage: "Hired",
      "Onboarding Manual Import": true,
      "Job Board": "Manual",
      "Stage History": JSON.stringify(stageHistoryArr),
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
        const staffRecs = await base("Staff").select({
          filterByFormula: `LOWER({Email})='${String(userEmail).toLowerCase().replace(/'/g, "\\'")}'`,
          maxRecords: 1
        }).firstPage()
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
    // Audit log failure
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
      const fakeRequest = { headers: new Headers({ "user-agent": "server-action", host: process.env.VERCEL_URL || "localhost" }) }
      await logAuditEvent({
        eventType: "New Hire Added",
        eventStatus: "Failure",
        userRole,
        userName,
        userIdentifier: userEmail,
        detailedMessage: `Create hired candidate failed for ${name} <${normalisedEmail}> (jobId: ${jobId || jobName || "n/a"}); error=${error?.message || "Unknown"}`,
        request: fakeRequest,
      })
    } catch (err) {
      logger?.error?.("audit log failed for createHiredApplicant failure", err)
    }
    throw new Error(error?.message || "Failed to create hired candidate")
  }
}

// Lookup an applicant by email (case-insensitive). Returns null if not found.
export async function findApplicantByEmail(email = "") {
  if (!email) return null
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    throw new Error("Server configuration error. Missing Airtable credentials.")
  }
  const normalisedEmail = String(email).trim().toLowerCase()
  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)
  const recs = await base("Applicants")
    .select({
      filterByFormula: `LOWER({Email})='${normalisedEmail.replace(/'/g, "\\'")}'`,
      maxRecords: 1
    })
    .firstPage()
  const rec = recs?.[0]
  if (!rec) return null
  const applying = rec.get("Applying For")
  let jobTitle = ""
  try {
    const jobId = Array.isArray(applying) && applying.length > 0 ? applying[0] : ""
    if (jobId) {
      const job = await base("Jobs").find(jobId)
      jobTitle = job?.get("Title") || ""
    }
  } catch {}
  return {
    id: rec.id,
    name: rec.get("Name") || "",
    email: rec.get("Email") || normalisedEmail,
    jobTitle,
    jobId: (Array.isArray(applying) && applying.length > 0) ? applying[0] : "",
    stage: rec.get("Stage") || ""
  }
}

// Set an existing applicant's Stage to Hired, appending stage history.
export async function hireExistingApplicant({ id = "" } = {}) {
  if (!id) throw new Error("Missing applicant id")
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    throw new Error("Server configuration error. Missing Airtable credentials.")
  }
  try {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)
    const existing = await base("Applicants").find(id)
    if (!existing) throw new Error("Applicant not found")
    const nowIso = new Date().toISOString()
    let stageHistoryArr = []
    try {
      const prevHistory = existing.get("Stage History")
      if (Array.isArray(prevHistory)) stageHistoryArr = [...prevHistory]
      else if (typeof prevHistory === "string" && prevHistory.trim()) stageHistoryArr = JSON.parse(prevHistory)
    } catch {}
    stageHistoryArr.push({ stage: "Hired", at: nowIso })
    const updated = await base("Applicants").update([
      { id, fields: { Stage: "Hired", "Stage History": JSON.stringify(stageHistoryArr) } }
    ])
    // Audit log
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
      const fakeRequest = { headers: new Headers({ "user-agent": "server-action", host: process.env.VERCEL_URL || "localhost" }) }
      await logAuditEvent({
        eventType: "New Hire Added",
        eventStatus: "Success",
        userRole,
        userName,
        userIdentifier: userEmail,
        detailedMessage: `Existing applicant ${existing.get("Name") || id} marked as Hired.`,
        request: fakeRequest,
      })
    } catch (err) {
      logger?.error?.("audit log failed for hireExistingApplicant", err)
    }
    return { id: updated[0].id, fields: updated[0].fields, mode: "updated" }
  } catch (error) {
    logger?.error?.("hireExistingApplicant error", error)
    // Audit log failure
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
      const fakeRequest = { headers: new Headers({ "user-agent": "server-action", host: process.env.VERCEL_URL || "localhost" }) }
      await logAuditEvent({
        eventType: "New Hire Added",
        eventStatus: "Failure",
        userRole,
        userName,
        userIdentifier: userEmail,
        detailedMessage: `Mark existing applicant as Hired failed for id=${id}; error=${error?.message || "Unknown"}`,
        request: fakeRequest,
      })
    } catch (err) {
      logger?.error?.("audit log failed for hireExistingApplicant failure", err)
    }
    throw new Error(error?.message || "Failed to update applicant status")
  }
}
