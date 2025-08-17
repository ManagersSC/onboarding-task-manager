import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import logger from "@/lib/utils/logger"
import { createNotification } from "@/lib/notifications"

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

export async function POST(request) {
  try {
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

    // Parse form data
    const formData = await request.formData()
    const applicantId = formData.get('applicantId')
    const documentType = formData.get('documentType')
    const field = formData.get('field')
    const category = formData.get('category')
    const files = formData.getAll('files')

    if (!applicantId || !documentType || !field || !category || files.length === 0) {
      return new Response(JSON.stringify({ 
        error: "Missing required fields",
        userError: "Please provide all required information and select files to upload."
      }), { status: 400 })
    }

    logger.info(`Admin ${session.userEmail} uploading ${files.length} document(s) of type ${documentType} for applicant ${applicantId}`)

    // Get current applicant to validate
    const applicantRecords = await base('Applicants').select({
      filterByFormula: `RECORD_ID() = '${applicantId}'`,
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

    // Process file uploads
    const uploadedFiles = []
    const errors = []

    for (const file of files) {
      try {
        // Convert file to buffer
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Upload to Airtable
        let uploadResult
        
        if (category === 'Application') {
          // Upload to Applicants table
          uploadResult = await base('Applicants').update(applicantId, {
            [field]: [{ filename: file.name, url: `data:${file.type};base64,${buffer.toString('base64')}` }]
          })
        } else {
          // Upload to Documents table
          uploadResult = await base('Documents').create([
            {
              fields: {
                'Applicants': [applicantId],
                'Applying For': [], // Will be populated if needed
                [field]: [{ filename: file.name, url: `data:${file.type};base64,${buffer.toString('base64')}` }],
                'Status': 'Pending',
                'Created By': session.userId || 'Admin'
              }
            }
          ])
        }

        uploadedFiles.push({
          name: file.name,
          size: file.size,
          type: file.type,
          field: field,
          category: category
        })

        logger.info(`Successfully uploaded ${file.name} for applicant ${applicantId}`)

      } catch (uploadError) {
        logger.error(`Failed to upload ${file.name}:`, uploadError)
        errors.push({
          name: file.name,
          error: uploadError.message
        })
      }
    }

    // Create notification for successful uploads
    if (uploadedFiles.length > 0) {
      try {
        await createNotification({
          title: `Documents Uploaded`,
          body: `${uploadedFiles.length} document(s) uploaded for ${applicantName}`,
          type: 'Document Upload',
          severity: 'Success',
          recipientId: session.userId,
          source: 'Admin Panel',
          actionURL: `/admin/users/${applicantId}`
        })
      } catch (notificationError) {
        logger.warn('Failed to create notification:', notificationError)
      }
    }

    // Return response
    const response = {
      success: true,
      message: `Successfully uploaded ${uploadedFiles.length} document(s)`,
      data: {
        applicantId,
        applicantName,
        uploadedFiles,
        errors: errors.length > 0 ? errors : undefined
      }
    }

    if (errors.length > 0) {
      response.warnings = `${errors.length} file(s) failed to upload`
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })

  } catch (error) {
    logger.error("Error uploading documents:", error)
    return new Response(JSON.stringify({
      error: "Failed to upload documents",
      userError: "Unable to upload documents. Please try again.",
      details: process.env.NODE_ENV === "development" ? error.message : null
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
}
