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
    const { id } = await params

    if (!id) {
      return new Response(JSON.stringify({ error: "Applicant ID is required" }), { status: 400 })
    }

    logger.info(`[DEBUG] Fetching documents for applicant: ${id}`)

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

    // 1. Fetch applicant record
    const applicantRecords = await base('Applicants').select({
      filterByFormula: `RECORD_ID() = '${id}'`,
      maxRecords: 1
    }).firstPage()

    if (applicantRecords.length === 0) {
      return new Response(JSON.stringify({ error: "Applicant not found" }), { status: 404 })
    }

    const applicantRecord = applicantRecords[0]
    logger.info(`[DEBUG] Found applicant: ${applicantRecord.get('Name')}`)

    // 2. Check initial application documents
    const initialDocFields = [
      { key: 'cv', name: 'CV', field: 'CV', category: 'Application' },
      { key: 'portfolio', name: 'Portfolio of Cases', field: 'Portfolio of Cases', category: 'Application' },
      { key: 'testimonials', name: 'Testimonials', field: 'Testimonials', category: 'Application' },
      { key: 'reference1', name: 'Reference 1', field: 'Reference 1', category: 'Application' },
      { key: 'reference2', name: 'Reference 2', field: 'Reference 2', category: 'Application' },
      { key: 'dbs_check', name: 'DBS Check', field: 'DBS Check', category: 'Legal' },
      { key: 'disc_pdf', name: 'DISC PDF', field: 'DISC PDF', category: 'Personal' }
    ]

    const initialDocuments = []
    const debugInfo = {
      applicantName: applicantRecord.get('Name'),
      applicantId: applicantRecord.id,
      availableFields: Object.keys(applicantRecord.fields || {}),
      fieldAnalysis: {}
    }

    initialDocFields.forEach(doc => {
      const attachments = applicantRecord.get(doc.field)
      const fieldInfo = {
        fieldName: doc.field,
        fieldType: typeof attachments,
        isArray: Array.isArray(attachments),
        length: Array.isArray(attachments) ? attachments.length : 'N/A',
        hasValue: !!attachments,
        rawValue: attachments
      }
      
      debugInfo.fieldAnalysis[doc.field] = fieldInfo
      
      if (Array.isArray(attachments) && attachments.length > 0) {
        logger.info(`[DEBUG] Found ${attachments.length} attachments for ${doc.field}`)
        attachments.forEach((attachment, index) => {
          if (attachment && typeof attachment === 'object') {
            logger.info(`[DEBUG] Processing attachment ${index} for ${doc.field}: ${JSON.stringify(attachment)}`)
            initialDocuments.push({
              id: `${doc.key}-${index}`,
              name: doc.name,
              category: doc.category,
              source: 'Initial Application',
              field: doc.field,
              attachment: attachment
            })
          }
        })
      } else if (attachments && typeof attachments === 'object' && !Array.isArray(attachments)) {
        // Handle single attachment object (not in array)
        logger.info(`[DEBUG] Found single attachment for ${doc.field}`)
        initialDocuments.push({
          id: `${doc.key}-0`,
          name: doc.name,
          category: doc.category,
          source: 'Initial Application',
          field: doc.field,
          attachment: attachments
        })
      }
    })

    // 3. Fetch documents from Documents table
    const documentRecords = await base('Documents').select({
      filterByFormula: `{Applicants} = '${id}'`,
      maxRecords: 100
    }).firstPage()

    logger.info(`[DEBUG] Found ${documentRecords.length} document records`)

    const postHiringDocuments = []
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

    documentRecords.forEach((docRecord, docIndex) => {
      logger.info(`[DEBUG] Processing document record ${docIndex}: ${docRecord.id}`)
      
      postHiringDocFields.forEach(doc => {
        const attachments = docRecord.get(doc.field)
        if (Array.isArray(attachments) && attachments.length > 0) {
          logger.info(`[DEBUG] Found ${attachments.length} attachments for ${doc.field} in document ${docIndex}`)
          attachments.forEach((attachment, index) => {
            if (attachment && typeof attachment === 'object') {
              postHiringDocuments.push({
                id: `${doc.key}-${docRecord.id}-${index}`,
                name: doc.name,
                category: doc.category,
                source: 'Post-Hiring',
                field: doc.field,
                attachment: attachment,
                documentRecordId: docRecord.id
              })
            }
          })
        } else if (attachments && typeof attachments === 'object' && !Array.isArray(attachments)) {
          postHiringDocuments.push({
            id: `${doc.key}-${docRecord.id}-0`,
            name: doc.name,
            category: doc.category,
            source: 'Post-Hiring',
            field: doc.field,
            attachment: attachments,
            documentRecordId: docRecord.id
          })
        }
      })
    })

    const allDocuments = [...initialDocuments, ...postHiringDocuments]

    return new Response(JSON.stringify({
      success: true,
      data: {
        applicantId: id,
        applicantName: applicantRecord.get('Name'),
        totalDocuments: allDocuments.length,
        initialDocuments: initialDocuments.length,
        postHiringDocuments: postHiringDocuments.length,
        documents: allDocuments,
        debug: debugInfo
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    logger.error("[DEBUG] Error in debug documents endpoint:", error)
    return new Response(JSON.stringify({
      error: "Internal server error",
      details: error.message
    }), { status: 500 })
  }
}
