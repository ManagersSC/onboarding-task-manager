import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import logger from "@/lib/utils/logger"

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

// Helper function to consolidate all documents from multiple sources
function consolidateAllDocuments(applicantRecord, documentRecords) {
  const allDocuments = []
  
  logger.info(`Starting document consolidation for applicant: ${applicantRecord.get('Name')}`)
  logger.info(`Document records count: ${documentRecords.length}`)
  
  // 1. Initial Application Documents (from Applicants table)
  const initialDocFields = [
    { key: 'cv', name: 'CV', field: 'CV', category: 'Application' },
    { key: 'reference1', name: 'Reference 1', field: 'Reference 1', category: 'Application' },
    { key: 'reference2', name: 'Reference 2', field: 'Reference 2', category: 'Application' },
    { key: 'dbs_check', name: 'DBS Check', field: 'DBS Check', category: 'Legal' },
    { key: 'disc_pdf', name: 'DISC PDF', field: 'DISC PDF', category: 'Personal' }
  ]
  
  logger.info(`Checking ${initialDocFields.length} initial document fields`)
  
  initialDocFields.forEach(doc => {
    const attachments = applicantRecord.get(doc.field)
    logger.info(`Field "${doc.field}": type=${typeof attachments}, value=${JSON.stringify(attachments)}`)
    
    if (Array.isArray(attachments) && attachments.length > 0) {
      logger.info(`Found ${attachments.length} attachments for ${doc.field}`)
      attachments.forEach((attachment, index) => {
        // Handle Airtable attachment objects
        if (attachment && typeof attachment === 'object') {
          logger.info(`Processing attachment ${index} for ${doc.field}: ${JSON.stringify(attachment)}`)
          allDocuments.push({
            id: `${doc.key}-${index}`,
            name: doc.name,
            category: doc.category,
            source: 'Initial Application',
            uploadedAt: attachment.createdTime || applicantRecord.get('Created Time') || 'Unknown',
            fileUrl: attachment.url || attachment.filename || '',
            status: 'Uploaded',
            type: attachment.type || 'Unknown',
            field: doc.field,
            originalName: attachment.filename || doc.name,
            size: attachment.size || 0
          })
        } else {
          logger.warn(`Attachment ${index} for ${doc.field} is not an object: ${typeof attachment}`)
        }
      })
    } else {
      logger.info(`No attachments found for field "${doc.field}"`)
    }
  })
  
  // 2. Post-Hiring Documents (from Documents table)
  const postHiringDocFields = [
    { key: 'passport', name: 'Passport', field: 'Passport', category: 'Legal' },
    { key: 'gdc_registration', name: 'GDC Registration', field: 'GDC Registration Certificate', category: 'Professional' },
    { key: 'qualification', name: 'Qualification Certificate', field: 'Qualification Certificate', category: 'Professional' },
    { key: 'dbs', name: 'DBS Check', field: 'DBS', category: 'Legal' },
    { key: 'indemnity', name: 'Indemnity Insurance', field: 'Indemnity Insurance', category: 'Professional' },
    { key: 'hep_b', name: 'Hep B Immunity', field: 'Hep B Immunity Record', category: 'Medical' },
    { key: 'cpd', name: 'CPD Training', field: 'CPD Training Certificates', category: 'Professional' },
    { key: 'profile_photo', name: 'Profile Photo', field: 'Profile Photo', category: 'Personal' },
    { key: 'basic_life_support', name: 'Basic Life Support', field: 'Basic Life Support Training', category: 'Training' },
    { key: 'p45', name: 'P45', field: 'P45', category: 'Employment' },
    { key: 'new_starter_info', name: 'New Starter Info', field: 'New Starter Information and Next of Kin Document', category: 'Employment' },
    { key: 'other', name: 'Other Documents', field: 'Other Documents', category: 'Miscellaneous' }
  ]
  
  logger.info(`Checking ${postHiringDocFields.length} post-hiring document fields`)
  
  documentRecords.forEach((docRecord, docIndex) => {
    logger.info(`Processing document record ${docIndex}: ${docRecord.id}`)
    logger.info(`Document record fields: ${Object.keys(docRecord.fields || {}).join(', ')}`)
    
    postHiringDocFields.forEach(doc => {
      const attachments = docRecord.get(doc.field)
      logger.info(`Field "${doc.field}" in document ${docIndex}: type=${typeof attachments}, value=${JSON.stringify(attachments)}`)
      
      if (Array.isArray(attachments) && attachments.length > 0) {
        logger.info(`Found ${attachments.length} attachments for ${doc.field} in document ${docIndex}`)
        attachments.forEach((attachment, index) => {
          // Handle Airtable attachment objects
          if (attachment && typeof attachment === 'object') {
            logger.info(`Processing attachment ${index} for ${doc.field} in document ${docIndex}: ${JSON.stringify(attachment)}`)
            allDocuments.push({
              id: `${doc.key}-${docRecord.id}-${index}`,
              name: doc.name,
              category: doc.category,
              source: 'Post-Hiring',
              uploadedAt: docRecord.get('Created TIme') || docRecord.get('Created Time') || 'Unknown',
              fileUrl: attachment.url || attachment.filename || '',
              status: docRecord.get('Status') || 'Pending',
              type: attachment.type || 'Unknown',
              field: doc.field,
              originalName: attachment.filename || doc.name,
              size: attachment.size || 0,
              documentRecordId: docRecord.id
            })
          } else {
            logger.warn(`Attachment ${index} for ${doc.field} in document ${docIndex} is not an object: ${typeof attachment}`)
          }
        })
      } else {
        logger.info(`No attachments found for field "${doc.field}" in document ${docIndex}`)
      }
    })
  })
  
  logger.info(`Consolidated ${allDocuments.length} documents from ${initialDocFields.length} initial fields and ${documentRecords.length} document records`)
  
  return allDocuments
}

 // Helper function to format detailed applicant data
 function formatDetailedApplicant(record, allDocuments, feedbackRecords = []) {
   try {
     // Use the properly fetched feedback records instead of getting them from the record
     const jobRecords = record.get('Applying For') || []
    
    // Simplified document tracking - just count what's present
    logger.info(`Processing documents for applicant - focusing on present documents only`)
    
    // Count feedback by type
    const feedbackStats = feedbackRecords.reduce((acc, feedback) => {
      // Check if feedback is a proper Airtable record object
      if (feedback && typeof feedback.get === 'function') {
        const stage = feedback.get('Interview Stage') || 'Unknown'
        if (stage === 'First Interview') {
          acc.firstInterview++
        } else if (stage === 'Second Interview') {
          acc.secondInterview++
        } else if (stage === 'Finished Interviews') {
          acc.finished++
        }
      } else {
        logger.warn(`Feedback record is not a proper Airtable object: ${typeof feedback}`)
      }
      return acc
    }, { firstInterview: 0, secondInterview: 0, finished: 0 })

    // Group documents by category
    const documentsByCategory = allDocuments.reduce((acc, doc) => {
      if (!acc[doc.category]) {
        acc[doc.category] = []
      }
      acc[doc.category].push(doc)
      return acc
    }, {})

    return {
      id: record.id,
      name: record.get('Name') || '',
      email: record.get('Email') || '',
      phone: record.get('Phone') || '',
      stage: record.get('Stage') || 'New Application',
      job: record.get('Job Name') || '',
      location: record.get('Interview Location') || '',
      interviewDate: record.get('Interview Date') || '',
      secondInterviewDate: record.get('Second Interview Date') || '',
      
      // Enhanced document tracking
      docs: {
        present: allDocuments.length,
        required: 0, // No longer tracking required documents
        completed: allDocuments.filter(doc => doc.status === 'Completed').length
      },
      requiredDocs: [], // No longer tracking required documents
      allDocuments: allDocuments,
      documentsByCategory: documentsByCategory,
      
      // Enhanced feedback tracking
      feedbackCount: feedbackRecords.length,
      feedbackStats: feedbackStats,
      feedbackFiles: feedbackRecords
        .filter(feedback => feedback && typeof feedback.get === 'function')
        .map(feedback => ({
          id: feedback.id,
          stage: feedback.get('Interview Stage'),
          notes: feedback.get('First Interview Notes') || feedback.get('Second Interview Notes'),
          rating: feedback.get('Rating') || feedback.get('Rating (2nd)'),
          createdAt: feedback.get('Created Time'),
          interviewer: feedback.get('Interviewer(s)')?.[0]?.get('Name') || 'Unknown'
        })),
      // Enhanced feedback documents extraction with debug logging
      feedbackDocuments: (() => {
        const documents = []
        
        logger.info(`Processing ${feedbackRecords.length} feedback records for documents`)
        
        feedbackRecords
          .filter(feedback => feedback && typeof feedback.get === 'function')
          .forEach((feedback, index) => {
            logger.info(`Processing feedback record ${index + 1}: ${feedback.id}`)
            
            // Debug: Log all available fields in this feedback record
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
                documentType: 'First Interview Questions',
                interviewStage: feedback.get('Interview Stage') || 'First Interview',
                fileName: doc.filename || doc.name || 'First Interview Questions',
                fileUrl: doc.url || doc.link || '',
                fileSize: doc.size || 0,
                fileType: doc.type || 'application/octet-stream',
                uploadedAt: feedback.get('Created Time') || new Date().toISOString(),
                interviewer: feedback.get('Interviewer(s)')?.[0]?.get?.('Name') || 'Unknown',
                rating: feedback.get('Rating'),
                notes: feedback.get('First Interview Notes'),
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
              logger.info(`Processing Second Interview doc ${docIndex}: ${JSON.stringify(doc)}`)
              documents.push({
                id: `${feedback.id}-second-${docIndex}`,
                feedbackId: feedback.id,
                documentType: 'Second Interview Questions',
                interviewStage: feedback.get('Interview Stage') || 'Second Interview',
                fileName: doc.filename || doc.name || 'Second Interview Questions',
                fileUrl: doc.url || doc.link || '',
                fileSize: doc.size || 0,
                fileType: doc.type || 'application/octet-stream',
                uploadedAt: feedback.get('Created Time') || new Date().toISOString(),
                interviewer: feedback.get('Interviewer(s)')?.[0]?.get?.('Name') || 'Unknown',
                rating: feedback.get('Rating (2nd)'),
                notes: feedback.get('Second Interview Notes'),
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
              logger.info(`Processing After Second Interview doc ${docIndex}: ${JSON.stringify(doc)}`)
              documents.push({
                id: `${feedback.id}-after-${docIndex}`,
                feedbackId: feedback.id,
                documentType: 'Docs - After Second Interview',
                interviewStage: feedback.get('Interview Stage') || 'Finished Interviews',
                fileName: doc.filename || doc.name || 'Document After Second Interview',
                fileUrl: doc.url || doc.link || '',
                fileSize: doc.size || 0,
                fileType: doc.type || 'application/octet-stream',
                uploadedAt: feedback.get('Created Time') || new Date().toISOString(),
                interviewer: feedback.get('Interviewer(s)')?.[0]?.get?.('Name') || 'Unknown',
                rating: feedback.get('Rating (2nd)'),
                notes: feedback.get('Second Interview Notes'),
                metadata: {
                  feedbackRecordId: feedback.id,
                  originalField: 'Docs - After Second Interview',
                  isAttachment: true,
                  debug: { doc }
                }
              })
            })
          })
        
        logger.info(`Total feedback documents extracted: ${documents.length}`)
        return documents
      })(),
      
      // Additional fields
      source: record.get('Job Board') || '',
      address: record.get('Address') || '',
      postCode: record.get('Post Code') || '',
      dateOfBirth: record.get('Date of Birth') || '',
      criteriaScore: record.get('Criteria Score') || 0,
      rejectionReason: record.get('Rejection Reason') || '',
      
      // Timestamps
      createdAt: record.get('Created Time') || '',
      updatedAt: record.get('Last Modified') || '',
      
      // Links
      submitFeedbackUrl: record.get('Submit Feedback') || '',
      openRecordUrl: record.get('Open Record Detail') || ''
    }
  } catch (formatError) {
    logger.error("Error formatting applicant data:", formatError)
    // Return basic data if formatting fails
    return {
      id: record.id,
      name: record.get('Name') || 'Error formatting data',
      email: record.get('Email') || '',
      phone: record.get('Phone') || '',
      stage: record.get('Stage') || 'Unknown',
      job: record.get('Job Name') || '',
      docs: { present: 0, required: 0, completed: 0 },
      feedbackCount: 0,
      feedbackStats: { firstInterview: 0, secondInterview: 0, finished: 0 },
      feedbackFiles: [],
      feedbackDocuments: [],
      requiredDocs: [],
      allDocuments: [],
      documentsByCategory: {}
    }
  }
}

export async function GET(request, { params }) {
  try {
    // Fix for Next.js 15: await params before destructuring
    const { id } = await params

    if (!id) {
      return new Response(JSON.stringify({ error: "Applicant ID is required" }), { status: 400 })
    }

    logger.info(`Fetching applicant with ID: ${id}`)

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

    logger.info(`Authenticated user: ${session.userEmail} fetching applicant ${id}`)

    // Get applicant from Airtable with expanded linked records
    const applicantRecords = await base('Applicants').select({
      filterByFormula: `RECORD_ID() = '${id}'`,
      expand: ['Applying For'],
      maxRecords: 1
    }).firstPage()

    if (applicantRecords.length === 0) {
      logger.warn(`Applicant not found with ID: ${id}`)
      return new Response(JSON.stringify({ 
        error: "Applicant not found",
        userError: "The requested applicant could not be found."
      }), { status: 404 })
    }

    const applicantRecord = applicantRecords[0]
    logger.info(`Found applicant: ${applicantRecord.get('Name')} (${applicantRecord.get('Email')})`)

    // Get feedback records separately since expand isn't working properly
    const feedbackRecordIds = applicantRecord.get('Feedback') || []
    logger.info(`Feedback record IDs: ${JSON.stringify(feedbackRecordIds)}`)
    
    let feedbackRecords = []
    if (feedbackRecordIds.length > 0) {
      // Fetch feedback records individually
      const feedbackPromises = feedbackRecordIds.map(async (feedbackId) => {
        try {
          const feedbackRecord = await base('Feedback').find(feedbackId)
          return feedbackRecord
        } catch (error) {
          logger.error(`Error fetching feedback record ${feedbackId}:`, error)
          return null
        }
      })
      
      feedbackRecords = (await Promise.all(feedbackPromises)).filter(record => record !== null)
      logger.info(`Successfully fetched ${feedbackRecords.length} feedback records`)
    }

    // Debug: Log what fields are available
    const availableFields = Object.keys(applicantRecord.fields || {})
    logger.info(`Available fields: ${availableFields.join(', ')}`)

    // Debug: Check specific document fields
    const cvField = applicantRecord.get('CV')
    const portfolioField = applicantRecord.get('Portfolio of Cases')
    logger.info(`CV field type: ${typeof cvField}, value: ${JSON.stringify(cvField)}`)
    logger.info(`Portfolio field type: ${typeof portfolioField}, value: ${JSON.stringify(portfolioField)}`)

    // Debug: Check if any field contains "CV" or "Portfolio" (case insensitive)
    const cvLikeFields = availableFields.filter(field => 
      field.toLowerCase().includes('cv') || 
      field.toLowerCase().includes('portfolio') ||
      field.toLowerCase().includes('reference') ||
      field.toLowerCase().includes('testimonial')
    )
    logger.info(`Fields that might contain documents: ${cvLikeFields.join(', ')}`)

    // Get documents from Documents table
    const documentRecords = await base('Documents').select({
      filterByFormula: `{Applicants} = '${id}'`,
      maxRecords: 100 // Reasonable limit for documents
    }).firstPage()

    logger.info(`Successfully fetched applicant ${id} and ${documentRecords.length} document records`)

    // Debug: Log document records structure
    if (documentRecords.length > 0) {
      const firstDoc = documentRecords[0]
      logger.info(`First document record fields: ${Object.keys(firstDoc.fields || {}).join(', ')}`)
      logger.info(`First document Applicants field: ${JSON.stringify(firstDoc.get('Applicants'))}`)
    }

    // Consolidate all documents
    const allDocuments = consolidateAllDocuments(applicantRecord, documentRecords)
    
         // Format applicant data with consolidated documents and proper feedback records
     const applicant = formatDetailedApplicant(applicantRecord, allDocuments, feedbackRecords)

    logger.info(`Successfully formatted applicant ${id} data with ${allDocuments.length} total documents`)
    logger.info(`Document categories found: ${Object.keys(applicant.documentsByCategory || {}).join(', ')}`)

    return new Response(JSON.stringify({ 
      applicant,
      metadata: {
        fetchedAt: new Date().toISOString(),
        recordId: id,
        totalDocuments: allDocuments.length,
        documentCategories: Object.keys(applicant.documentsByCategory || {}),
        debug: {
          availableFields,
          cvFieldType: typeof cvField,
          cvFieldValue: cvField,
          portfolioFieldType: typeof portfolioField,
          portfolioFieldValue: portfolioField,
          documentRecordsCount: documentRecords.length
        }
      }
    }), {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=300" // 5 minute cache
      }
    })

  } catch (error) {
    logger.error("Error fetching applicant:", error)
    return new Response(JSON.stringify({
      error: "Failed to fetch applicant",
      userError: "Unable to load applicant details. Please try again.",
      details: process.env.NODE_ENV === "development" ? error.message : null
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
}
