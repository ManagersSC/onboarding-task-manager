import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import logger from "@/lib/utils/logger"

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

// Helper function to extract feedback documents from feedback records
function extractFeedbackDocuments(feedbackRecords) {
  const documents = []
  
  logger.info(`Extracting feedback documents from ${feedbackRecords.length} feedback records`)
  
  feedbackRecords
    .filter(feedback => feedback && typeof feedback.get === 'function')
    .forEach((feedback, index) => {
      logger.info(`Processing feedback record ${index + 1}: ${feedback.id}`)
      
      // Get all available fields for debugging
      const feedbackFields = Object.keys(feedback.fields || {})
      logger.info(`Feedback record ${index + 1} fields: ${feedbackFields.join(', ')}`)
      
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
          logger.info(`Found First Interview Questions in field: ${fieldName}`)
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
          logger.info(`Found Second Interview Questions in field: ${fieldName}`)
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
          logger.info(`Found After Second Interview Docs in field: ${fieldName}`)
          afterSecondDocs = docs
          break
        }
      }
      
      logger.info(`Found documents: First Interview: ${firstInterviewDocs.length}, Second Interview: ${secondInterviewDocs.length}, After Second: ${afterSecondDocs.length}`)
      
      // Process First Interview Questions
      firstInterviewDocs.forEach((doc, docIndex) => {
        logger.info(`Processing First Interview doc ${docIndex}: ${JSON.stringify(doc)}`)
                 documents.push({
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
             isAttachment: true
           }
         })
      })
      
      // Process Second Interview Questions
      secondInterviewDocs.forEach((doc, docIndex) => {
        logger.info(`Processing Second Interview doc ${docIndex}: ${JSON.stringify(doc)}`)
                 documents.push({
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
             isAttachment: true
           }
         })
      })
      
      // Process Docs - After Second Interview
      afterSecondDocs.forEach((doc, docIndex) => {
        logger.info(`Processing After Second Interview doc ${docIndex}: ${JSON.stringify(doc)}`)
                 documents.push({
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
             isAttachment: true
           }
         })
      })
    })
  
  logger.info(`Total feedback documents extracted: ${documents.length}`)
  return documents
}

export async function GET(request, { params }) {
  try {
    // Fix for Next.js 15: await params before destructuring
    const { id } = await params

    if (!id) {
      return new Response(JSON.stringify({ error: "Applicant ID is required" }), { status: 400 })
    }

    logger.info(`Fetching feedback documents for applicant: ${id}`)

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
    logger.info(`Found applicant: ${applicantRecord.get('Name')}`)

    // Get feedback record IDs from the applicant
    const feedbackIds = applicantRecord.get('Feedback') || []
    logger.info(`Feedback IDs from applicant: ${JSON.stringify(feedbackIds)}`)

    // Fetch each feedback record individually
    const feedbackRecords = []
    for (const feedbackId of feedbackIds) {
      try {
        const feedbackRecord = await base('Feedback').find(feedbackId)
        logger.info(`Successfully fetched feedback record: ${feedbackId}`)
        feedbackRecords.push(feedbackRecord)
      } catch (error) {
        logger.error(`Error fetching feedback record ${feedbackId}:`, error)
      }
    }

    logger.info(`Successfully fetched ${feedbackRecords.length} feedback records`)

    // Extract feedback documents
    const feedbackDocuments = extractFeedbackDocuments(feedbackRecords)

    // Group documents by interview stage for better organization
    const documentsByStage = feedbackDocuments.reduce((acc, doc) => {
      const stage = doc.interviewStage || 'Unknown'
      if (!acc[stage]) {
        acc[stage] = []
      }
      acc[stage].push(doc)
      return acc
    }, {})

    // Group documents by type
    const documentsByType = feedbackDocuments.reduce((acc, doc) => {
      const type = doc.documentType || 'Unknown'
      if (!acc[type]) {
        acc[type] = []
      }
      acc[type].push(doc)
      return acc
    }, {})

    // Calculate statistics
    const stats = {
      total: feedbackDocuments.length,
      byStage: Object.keys(documentsByStage).reduce((acc, stage) => {
        acc[stage] = documentsByStage[stage].length
        return acc
      }, {}),
      byType: Object.keys(documentsByType).reduce((acc, type) => {
        acc[type] = documentsByType[type].length
        return acc
      }, {})
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        applicantId: id,
        applicantName: applicantRecord.get('Name'),
        documents: feedbackDocuments,
        documentsByStage,
        documentsByType,
        stats,
        metadata: {
          totalFeedbackRecords: feedbackRecords.length,
          extractionTimestamp: new Date().toISOString(),
          cacheKey: `feedback-documents-${id}-${Date.now()}`
        }
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300, s-maxage=300' // 5 minutes cache
      }
    })

  } catch (error) {
    logger.error("Error in feedback documents endpoint:", error)
    return new Response(JSON.stringify({
      error: "Internal server error",
      details: error.message
    }), { status: 500 })
  }
}
