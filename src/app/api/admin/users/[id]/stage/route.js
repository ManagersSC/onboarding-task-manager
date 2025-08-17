import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import logger from "@/lib/utils/logger"
import { createNotification } from "@/lib/notifications"

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

// Valid stage transitions
const VALID_STAGE_TRANSITIONS = {
  'New Application': ['First Interview Invite Sent'],
  'First Interview Invite Sent': ['First Interview Booked', 'Interview Cancelled'],
  'First Interview Booked': ['Under Review', 'Interview Rescheduled'],
  'Under Review': ['Reviewed', 'Rejected - After First Interview'],
  'Reviewed': ['Second Interview Invite Sent', 'Rejected - After First Interview'],
  'Second Interview Invite Sent': ['Second Interview Booked', 'Interview Cancelled'],
  'Second Interview Booked': ['Second Interview Finished', 'Interview Rescheduled'],
  'Second Interview Finished': ['Reviewed (2nd)', 'Rejected - After Second Interview'],
  'Reviewed (2nd)': ['Hired', 'Rejected - After Second Interview'],
  'Interview Cancelled': ['First Interview Invite Sent', 'Second Interview Invite Sent'],
  'Interview Rescheduled': ['First Interview Booked', 'Second Interview Booked']
}

export async function PATCH(request, { params }) {
  try {
    // Fix for Next.js 15: await params before destructuring
    const { id } = await params

    if (!id) {
      return new Response(JSON.stringify({ error: "Applicant ID is required" }), { status: 400 })
    }

    // Authentication check
    const cookieStore = await cookies()
    const sealedSession = cookieStore.get("session")?.value
    
    if (!sealedSession) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 })
    }

    const session = await unsealData(sealedSession, {
      password: process.env.SESSION_SECRET,
    })

    if (!session || session.userRole !== 'admin') {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { stage, location, notes } = body

    if (!stage) {
      return new Response(JSON.stringify({ error: "Stage is required" }), { status: 400 })
    }

    // Get current applicant to validate transition
    const currentApplicant = await base('Applicants').select({
      filterByFormula: `RECORD_ID() = '${id}'`,
      maxRecords: 1
    }).firstPage()

    if (currentApplicant.length === 0) {
      return new Response(JSON.stringify({ error: "Applicant not found" }), { status: 404 })
    }

    const currentStage = currentApplicant[0].get('Stage')
    
    // Validate stage transition
    const allowedTransitions = VALID_STAGE_TRANSITIONS[currentStage] || []
    if (!allowedTransitions.includes(stage)) {
      return new Response(JSON.stringify({ 
        error: `Invalid stage transition from ${currentStage} to ${stage}`,
        userError: `Cannot move applicant from ${currentStage} to ${stage}. Allowed transitions: ${allowedTransitions.join(', ')}`
      }), { status: 400 })
    }

    // Validate location requirement for interview stages
    if (stage.includes('Interview Invite') && !location) {
      return new Response(JSON.stringify({ 
        error: "Location is required for interview invite stages",
        userError: "Please provide an interview location"
      }), { status: 400 })
    }

    // Prepare update data
    const updateData = {
      'Stage': stage
    }

    // Add location if provided
    if (location) {
      if (stage.includes('First Interview')) {
        updateData['Interview Location'] = location
      } else if (stage.includes('Second Interview')) {
        updateData['Interview Location'] = location
      }
    }

    // Update applicant in Airtable
    await base('Applicants').update(id, updateData)

    // Create notification for stage change
    try {
      await createNotification({
        title: `Applicant Stage Updated`,
        body: `${currentApplicant[0].get('Name')} moved from ${currentStage} to ${stage}`,
        type: 'Task Update',
        severity: 'Info',
        recipientId: session.userId,
        source: 'Admin Panel',
        actionURL: `/admin/users/${id}`
      })
    } catch (notificationError) {
      logger.warn('Failed to create notification:', notificationError)
      // Don't fail the request if notification fails
    }

    // Log the stage change
    logger.info(`Applicant ${id} stage changed from ${currentStage} to ${stage} by admin ${session.userEmail}`)

    return new Response(JSON.stringify({
      success: true,
      message: `Applicant stage updated to ${stage}`,
      data: {
        id,
        previousStage: currentStage,
        newStage: stage,
        updatedAt: new Date().toISOString()
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })

  } catch (error) {
    logger.error("Error updating applicant stage:", error)
    return new Response(JSON.stringify({
      error: "Failed to update applicant stage",
      userError: "Unable to update applicant stage. Please try again.",
      details: process.env.NODE_ENV === "development" ? error.message : null
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
}
