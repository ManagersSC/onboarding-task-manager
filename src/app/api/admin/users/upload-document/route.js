import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import logger from "@/lib/utils/logger"
import { createNotification } from "@/lib/notifications"
import { NOTIFICATION_TYPES } from "@/lib/notification-types"

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

    // VULN-M11: Allowlist valid upload field names
    const ALLOWED_UPLOAD_FIELDS = [
      'CV', 'Portfolio of Cases', 'Testimonials', 'Reference 1', 'Reference 2',
      'DBS Check', 'DISC PDF', 'Passport', 'GDC Registration Certificate',
      'Qualification Certificate', 'DBS', 'Indemnity Insurance', 'Hep B Immunity Record',
      'CPD Training Certificates', 'Profile Photo', 'Basic Life Support Training',
      'P45', 'New Starter Information and Next of Kin Document', 'Other Documents',
    ]
    if (!ALLOWED_UPLOAD_FIELDS.includes(field)) {
      return new Response(JSON.stringify({
        error: "Invalid field name",
        userError: "The specified document field is not allowed."
      }), { status: 400 })
    }

    // VULN-H9: File size limit (10MB per file)
    const MAX_FILE_SIZE = 10 * 1024 * 1024
    // VULN-H10: Allowed MIME types
    const ALLOWED_MIME_TYPES = [
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    ]
    const BLOCKED_EXTENSIONS = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.html', '.htm', '.svg', '.js']

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return new Response(JSON.stringify({
          error: `File "${file.name}" exceeds the 10MB size limit`,
          userError: `File "${file.name}" is too large. Maximum size is 10MB.`
        }), { status: 400 })
      }
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return new Response(JSON.stringify({
          error: `File type "${file.type}" is not allowed`,
          userError: `File "${file.name}" has an unsupported file type. Please upload PDF, DOCX, or image files.`
        }), { status: 400 })
      }
      const ext = (file.name || '').toLowerCase().match(/\.[^.]+$/)?.[0] || ''
      if (BLOCKED_EXTENSIONS.includes(ext)) {
        return new Response(JSON.stringify({
          error: `File extension "${ext}" is not allowed`,
          userError: `File "${file.name}" has a blocked file extension.`
        }), { status: 400 })
      }
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
          type: NOTIFICATION_TYPES.DOCUMENT_UPLOAD,
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
