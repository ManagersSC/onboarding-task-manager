import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import logger from "@/lib/utils/logger"
import { logAuditEvent } from "@/lib/auditLogger"

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

// Helper function for file upload to Airtable
async function uploadFileViaJson(recordId, fieldName, file) {
  const arrayBuffer = await file.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString("base64")
  const body = {
    contentType: file.type || "application/octet-stream",
    filename: file.name,
    file: base64,
  }
  const url = `https://content.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${recordId}/${encodeURIComponent(fieldName)}/uploadAttachment`
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Upload failed (${resp.status}): ${text}`)
  }
  return resp.json()
}

export async function POST(request, { params }) {
  try {
    // Authentication check
    const { id } = await params
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

    // Parse form data
    const formData = await request.formData()
    const interviewStage = formData.get('interviewStage') // 'First Interview' | 'Second Interview'
    const notes = formData.get('notes') || ''
    const rating = formData.get('rating') || null
    const files = formData.getAll('files')

    if (!interviewStage || files.length === 0) {
      return new Response(JSON.stringify({ 
        error: "Missing required fields",
        userError: "Please provide interview stage and select files to upload."
      }), { status: 400 })
    }

    // Validate interview stage
    const validStages = ['First Interview', 'Second Interview', 'Finished Interviews']
    if (!validStages.includes(interviewStage)) {
      return new Response(JSON.stringify({ 
        error: "Invalid interview stage",
        userError: "Interview stage must be one of: First Interview, Second Interview, or Finished Interviews."
      }), { status: 400 })
    }

    // Validate applicant exists
    const applicantRecords = await base('Applicants').select({
      filterByFormula: `RECORD_ID() = '${id}'`,
      fields: ['Name', 'Email'],
      maxRecords: 1
    }).firstPage()

    if (applicantRecords.length === 0) {
      return new Response(JSON.stringify({ 
        error: "Applicant not found",
        userError: "The specified applicant could not be found."
      }), { status: 404 })
    }

    const applicant = applicantRecords[0]
    const applicantName = applicant.get('Name') || 'Unknown'
    const applicantEmail = applicant.get('Email') || 'Unknown'

    logger.info(`Admin ${session.userEmail} uploading ${files.length} feedback document(s) for applicant ${applicantName} (${applicantEmail})`)

    // Create feedback record in Airtable
    const feedbackFields = {
      'Applicant': [id],
      'Interview Stage': interviewStage
    }

    // Add notes based on interview stage
    if (interviewStage === 'First Interview') {
      feedbackFields['First Interview Notes'] = notes
      if (rating) feedbackFields['Rating'] = parseInt(rating)
    } else if (interviewStage === 'Second Interview') {
      feedbackFields['Second Interview Notes'] = notes
      if (rating) feedbackFields['Rating (2nd)'] = parseInt(rating)
    }

    // Create the feedback record first
    const feedbackRecord = await base('Feedback').create([{
      fields: feedbackFields
    }])

    const feedbackId = feedbackRecord[0].id
    logger.info(`Created feedback record ${feedbackId} for applicant ${id}`)

    // Upload files to the appropriate field
    const fieldName = interviewStage === 'First Interview' 
      ? 'First Interview Questions' 
      : interviewStage === 'Second Interview' 
        ? 'Second Interview Questions' 
        : 'Docs - After Second Interview'

    // Upload each file
    const uploadedFiles = []
    for (const file of files) {
      try {
        await uploadFileViaJson(feedbackId, fieldName, file)
        uploadedFiles.push({
          name: file.name,
          size: file.size,
          type: file.type
        })
        logger.info(`Successfully uploaded ${file.name} to feedback record ${feedbackId}`)
      } catch (uploadError) {
        logger.error(`Failed to upload ${file.name}:`, uploadError)
        throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`)
      }
    }

    // Note: Per latest requirement, do NOT change applicant stage or merge records here.

    // Log audit event
    logAuditEvent({
      eventType: 'Document Upload',
      eventStatus: 'Success',
      userName: session.userName,
      userRole: session.userRole,
      userIdentifier: session.userEmail,
      detailedMessage: `Uploaded ${files.length} feedback document(s) for applicant ${applicantName} (${applicantEmail}) to feedback record ${feedbackId}`
    })

    return new Response(JSON.stringify({
      success: true,
      feedbackId,
      uploadedFiles,
      message: `Successfully uploaded ${files.length} feedback document(s)`,
      metadata: {
        applicantId: id,
        applicantName,
        applicantEmail,
        interviewStage,
        fieldName,
        uploadedAt: new Date().toISOString()
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })

  } catch (error) {
    logger.error("Error uploading feedback documents:", error)
    return new Response(JSON.stringify({
      error: "Failed to upload feedback documents",
      userError: "Unable to upload feedback documents. Please try again.",
      details: process.env.NODE_ENV === "development" ? error.message : null
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
}
