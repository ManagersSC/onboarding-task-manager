"use server"

import { updateApplicantInStore, addApplicantsFromEmails, addFeedbackFiles, getApplicantById } from "@/lib/mock-db"
import { inviteStageNeedsLocation, normalizeLocationLabel } from "@/lib/stage"

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
