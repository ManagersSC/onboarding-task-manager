import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import logger from "@/lib/utils/logger"

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

export async function GET(request, { params }) {
  // VULN-L1: Gate debug endpoint behind NODE_ENV
  if (process.env.NODE_ENV === "production") {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404 })
  }

  try {
    // Fix for Next.js 15: await params before destructuring
    const { id } = await params

    if (!id) {
      return new Response(JSON.stringify({ error: "Applicant ID is required" }), { status: 400 })
    }

    logger.info(`[DEBUG] Fetching applicant with ID: ${id}`)

    // Authentication check
    const cookieStore = await cookies()
    const sealedSession = cookieStore.get("session")?.value
    
    if (!sealedSession) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 })
    }

    const session = await unsealData(sealedSession, {
      password: process.env.SESSION_SECRET,
    })

    if (!session.userRole || session.userRole !== 'admin') {
      return new Response(JSON.stringify({ error: "Not authorized" }), { status: 403 })
    }

    // Fetch the applicant record
    const applicantRecord = await base('Applicants').find(id)
    logger.info(`[DEBUG] Found applicant: ${applicantRecord.get('Name')}`)

    // Get feedback record IDs from the applicant
    const feedbackIds = applicantRecord.get('Feedback') || []
    logger.info(`[DEBUG] Feedback IDs from applicant: ${JSON.stringify(feedbackIds)}`)

    // Fetch each feedback record individually
    const feedbackRecords = []
    for (const feedbackId of feedbackIds) {
      try {
        const feedbackRecord = await base('Feedback').find(feedbackId)
        logger.info(`[DEBUG] Successfully fetched feedback record: ${feedbackId}`)
        feedbackRecords.push(feedbackRecord)
      } catch (error) {
        logger.error(`[DEBUG] Error fetching feedback record ${feedbackId}:`, error)
      }
    }

    logger.info(`[DEBUG] Successfully fetched ${feedbackRecords.length} feedback records`)

    // Extract feedback documents using the same logic as the main API
    const feedbackDocuments = []
    
    logger.info(`[DEBUG] Processing ${feedbackRecords.length} feedback records for documents`)
    
    feedbackRecords
      .filter(feedback => feedback && typeof feedback.get === 'function')
      .forEach((feedback, index) => {
        logger.info(`[DEBUG] Processing feedback record ${index + 1}: ${feedback.id}`)
        
        // Debug: Log all available fields in this feedback record
        const feedbackFields = Object.keys(feedback.fields || {})
        logger.info(`[DEBUG] Feedback record ${index + 1} fields: ${feedbackFields.join(', ')}`)
        
        // Try different possible field names for First Interview Questions
        const firstInterviewFieldNames = [
          'First Interview Questions',
          'First Interview Question',
          'First Interview Questions (Attachments)',
          'First Interview Questions (Files)'
        ]
        
        let firstInterviewDocs = []
        for (const fieldName of firstInterviewFieldNames) {
          const docs = feedback.get(fieldName)
          if (docs && Array.isArray(docs) && docs.length > 0) {
            logger.info(`[DEBUG] Found First Interview Questions in field: ${fieldName}`)
            firstInterviewDocs = docs
            break
          }
        }
        
        // Try different possible field names for Second Interview Questions
        const secondInterviewFieldNames = [
          'Second Interview Questions',
          'Second Interview Question',
          'Second Interview Questions (Attachments)',
          'Second Interview Questions (Files)'
        ]
        
        let secondInterviewDocs = []
        for (const fieldName of secondInterviewFieldNames) {
          const docs = feedback.get(fieldName)
          if (docs && Array.isArray(docs) && docs.length > 0) {
            logger.info(`[DEBUG] Found Second Interview Questions in field: ${fieldName}`)
            secondInterviewDocs = docs
            break
          }
        }
        
        // Try different possible field names for Docs - After Second Interview
        const afterSecondFieldNames = [
          'Docs - After Second Interview',
          'Documents - After Second Interview',
          'After Second Interview Documents',
          'After Second Interview Docs'
        ]
        
        let afterSecondDocs = []
        for (const fieldName of afterSecondFieldNames) {
          const docs = feedback.get(fieldName)
          if (docs && Array.isArray(docs) && docs.length > 0) {
            logger.info(`[DEBUG] Found After Second Interview Docs in field: ${fieldName}`)
            afterSecondDocs = docs
            break
          }
        }
        
        logger.info(`[DEBUG] Found documents: First Interview: ${firstInterviewDocs.length}, Second Interview: ${secondInterviewDocs.length}, After Second: ${afterSecondDocs.length}`)
        
        // Process First Interview Questions
        firstInterviewDocs.forEach((doc, docIndex) => {
          logger.info(`[DEBUG] Processing First Interview doc ${docIndex}: ${JSON.stringify(doc)}`)
                     feedbackDocuments.push({
             id: `${feedback.id}-first-${docIndex}`,
             feedbackId: feedback.id,
             documentType: 'First Interview Notes',
             interviewStage: feedback.get('Interview Stage') || 'First Interview',
             fileName: doc.filename || doc.name || 'First Interview Notes',
             fileUrl: doc.url || doc.link || '',
             fileSize: doc.size || 0,
             fileType: doc.type || 'application/octet-stream',
             uploadedAt: feedback.get('Created Time') || new Date().toISOString(),
             interviewer: feedback.get('Interviewer(s)')?.[0]?.get?.('Name') || 'Unknown',
             rating: feedback.get('Rating'),
             // Add fields that the file viewer expects
             name: doc.filename || doc.name || 'First Interview Notes',
             originalName: doc.filename || doc.name || 'First Interview Notes',
             url: doc.url || doc.link || '',
             proxyUrl: doc.url || doc.link ? `/api/admin/files/proxy?url=${encodeURIComponent(doc.url || doc.link)}` : '',
             type: doc.type || 'application/octet-stream',
             size: doc.size || 0,
             metadata: {
               feedbackRecordId: feedback.id,
               originalField: 'First Interview Questions',
               isAttachment: true,
               debug: { doc }
             }
           })
        })
        
        // Process Second Interview Questions
        secondInterviewDocs.forEach((doc, docIndex) => {
          logger.info(`[DEBUG] Processing Second Interview doc ${docIndex}: ${JSON.stringify(doc)}`)
                     feedbackDocuments.push({
             id: `${feedback.id}-second-${docIndex}`,
             feedbackId: feedback.id,
             documentType: 'Second Interview Notes',
             interviewStage: feedback.get('Interview Stage') || 'Second Interview',
             fileName: doc.filename || doc.name || 'Second Interview Notes',
             fileUrl: doc.url || doc.link || '',
             fileSize: doc.size || 0,
             fileType: doc.type || 'application/octet-stream',
             uploadedAt: feedback.get('Created Time') || new Date().toISOString(),
             interviewer: feedback.get('Interviewer(s)')?.[0]?.get?.('Name') || 'Unknown',
             rating: feedback.get('Rating (2nd)'),
             // Add fields that the file viewer expects
             name: doc.filename || doc.name || 'Second Interview Notes',
             originalName: doc.filename || doc.name || 'Second Interview Notes',
             url: doc.url || doc.link || '',
             proxyUrl: doc.url || doc.link ? `/api/admin/files/proxy?url=${encodeURIComponent(doc.url || doc.link)}` : '',
             type: doc.type || 'application/octet-stream',
             size: doc.size || 0,
             metadata: {
               feedbackRecordId: feedback.id,
               originalField: 'Second Interview Questions',
               isAttachment: true,
               debug: { doc }
             }
           })
        })
        
        // Process Docs - After Second Interview
        afterSecondDocs.forEach((doc, docIndex) => {
          logger.info(`[DEBUG] Processing After Second Interview doc ${docIndex}: ${JSON.stringify(doc)}`)
                     feedbackDocuments.push({
             id: `${feedback.id}-after-${docIndex}`,
             feedbackId: feedback.id,
             documentType: 'After Second Interview Notes',
             interviewStage: feedback.get('Interview Stage') || 'Finished Interviews',
             fileName: doc.filename || doc.name || 'After Second Interview Notes',
             fileUrl: doc.url || doc.link || '',
             fileSize: doc.size || 0,
             fileType: doc.type || 'application/octet-stream',
             uploadedAt: feedback.get('Created Time') || new Date().toISOString(),
             interviewer: feedback.get('Interviewer(s)')?.[0]?.get?.('Name') || 'Unknown',
             rating: feedback.get('Rating (2nd)'),
             // Add fields that the file viewer expects
             name: doc.filename || doc.name || 'After Second Interview Notes',
             originalName: doc.filename || doc.name || 'After Second Interview Notes',
             url: doc.url || doc.link || '',
             proxyUrl: doc.url || doc.link ? `/api/admin/files/proxy?url=${encodeURIComponent(doc.url || doc.link)}` : '',
             type: doc.type || 'application/octet-stream',
             size: doc.size || 0,
             metadata: {
               feedbackRecordId: feedback.id,
               originalField: 'Docs - After Second Interview',
               isAttachment: true,
               debug: { doc }
             }
           })
        })
      })
    
    logger.info(`[DEBUG] Total feedback documents extracted: ${feedbackDocuments.length}`)

    // Return comprehensive debug information
    return new Response(JSON.stringify({
      success: true,
      debug: {
        applicantId: id,
        applicantName: applicantRecord.get('Name'),
        feedbackIds,
        feedbackRecordsCount: feedbackRecords.length,
        feedbackDocumentsCount: feedbackDocuments.length,
        feedbackRecords: feedbackRecords.map(feedback => ({
          id: feedback.id,
          fields: Object.keys(feedback.fields || {}),
          interviewStage: feedback.get('Interview Stage'),
          createdTime: feedback.get('Created Time')
        })),
        feedbackDocuments,
        extractionSummary: {
          totalDocuments: feedbackDocuments.length,
          byType: feedbackDocuments.reduce((acc, doc) => {
            acc[doc.documentType] = (acc[doc.documentType] || 0) + 1
            return acc
          }, {}),
          byStage: feedbackDocuments.reduce((acc, doc) => {
            acc[doc.interviewStage] = (acc[doc.interviewStage] || 0) + 1
            return acc
          }, {})
        }
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    logger.error("[DEBUG] Error in debug feedback endpoint:", error)
    return new Response(JSON.stringify({
      error: "Internal server error",
      details: error.message,
      stack: error.stack
    }), { status: 500 })
  }
}
