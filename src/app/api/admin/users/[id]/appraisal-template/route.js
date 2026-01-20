import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import logger from "@/lib/utils/logger"
import {
  normalizeQuestions,
  validateQuestionsJSON,
  createQuestionsJSON,
  parseAirtableQuestionsField,
  generateRoleKey
} from "@/lib/utils/appraisal-questions"

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

// Airtable field names/IDs (from ATS_schema.json)
// Note: Using field NAMES for better compatibility with Airtable JS SDK
// Applicants table
const FIELD_APPLYING_FOR = "Applying For" // fld2kd9SxfdltFVwW - link to Jobs
// Jobs table
const FIELD_JOB_TITLE = "Title" // fldTvEi44E8tSTsWL - primary field (job name)
const FIELD_JOB_TEMPLATE = "Preappraisal Questions Template (JSON)" // fldWdgCRTKzRJBPXI

/**
 * GET /api/admin/users/[id]/appraisal-template
 * Returns the job template questions for an applicant's linked job
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params
    if (!id) {
      return new Response(JSON.stringify({ error: "Applicant ID required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      })
    }

    // Auth check
    const cookieStore = await cookies()
    const sealedSession = cookieStore.get("session")?.value
    if (!sealedSession) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      })
    }
    const session = await unsealData(sealedSession, { password: process.env.SESSION_SECRET })
    if (!session || session.userRole !== "admin") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      })
    }

    // Fetch applicant record to get linked job
    const applicantRecords = await base("Applicants")
      .select({
        filterByFormula: `RECORD_ID() = '${id}'`,
        fields: [FIELD_APPLYING_FOR],
        maxRecords: 1
      })
      .firstPage()

    if (!applicantRecords?.[0]) {
      return new Response(JSON.stringify({ error: "Applicant not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      })
    }

    const applyingFor = applicantRecords[0].get(FIELD_APPLYING_FOR)
    if (!applyingFor || applyingFor.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        hasJob: false,
        jobId: null,
        jobName: null,
        template: {
          version: 1,
          type: "preappraisal",
          roleKey: "unknown",
          updatedAt: new Date().toISOString(),
          questions: []
        },
        warning: "Applicant has no linked job"
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    }

    const jobId = applyingFor[0]

    // Fetch job record
    const jobRecords = await base("Jobs")
      .select({
        filterByFormula: `RECORD_ID() = '${jobId}'`,
        fields: [FIELD_JOB_TITLE, FIELD_JOB_TEMPLATE],
        maxRecords: 1
      })
      .firstPage()

    if (!jobRecords?.[0]) {
      return new Response(JSON.stringify({
        success: true,
        hasJob: false,
        jobId,
        jobName: null,
        template: {
          version: 1,
          type: "preappraisal",
          roleKey: "unknown",
          updatedAt: new Date().toISOString(),
          questions: []
        },
        warning: "Linked job not found"
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    }

    const jobRecord = jobRecords[0]
    const jobName = jobRecord.get(FIELD_JOB_TITLE) || "Unknown Job"
    const templateRaw = jobRecord.get(FIELD_JOB_TEMPLATE)
    const roleKey = generateRoleKey(jobName)

    // Parse template
    const templateResult = parseAirtableQuestionsField(templateRaw)

    if (templateResult.success) {
      return new Response(JSON.stringify({
        success: true,
        hasJob: true,
        jobId,
        jobName,
        template: templateResult.data
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    }

    // No valid template - return empty structure
    return new Response(JSON.stringify({
      success: true,
      hasJob: true,
      jobId,
      jobName,
      template: {
        version: 1,
        type: "preappraisal",
        roleKey,
        updatedAt: new Date().toISOString(),
        questions: []
      },
      warning: templateResult.error || "No template found for this job"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  } catch (error) {
    logger?.error?.("GET appraisal-template failed", error)
    return new Response(JSON.stringify({ error: "Failed to fetch appraisal template" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
}

/**
 * POST /api/admin/users/[id]/appraisal-template
 * Save job template questions (updates the linked job's template)
 * Body: { questions: [{order, text}, ...] } or full JSON structure
 */
export async function POST(request, { params }) {
  try {
    const { id } = await params
    if (!id) {
      return new Response(JSON.stringify({ error: "Applicant ID required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      })
    }

    // Auth check
    const cookieStore = await cookies()
    const sealedSession = cookieStore.get("session")?.value
    if (!sealedSession) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      })
    }
    const session = await unsealData(sealedSession, { password: process.env.SESSION_SECRET })
    if (!session || session.userRole !== "admin") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      })
    }

    const body = await request.json().catch(() => ({}))

    // Fetch applicant record to get linked job
    const applicantRecords = await base("Applicants")
      .select({
        filterByFormula: `RECORD_ID() = '${id}'`,
        fields: [FIELD_APPLYING_FOR],
        maxRecords: 1
      })
      .firstPage()

    if (!applicantRecords?.[0]) {
      return new Response(JSON.stringify({ error: "Applicant not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      })
    }

    const applyingFor = applicantRecords[0].get(FIELD_APPLYING_FOR)
    if (!applyingFor || applyingFor.length === 0) {
      return new Response(JSON.stringify({ error: "Applicant has no linked job to update template for" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      })
    }

    const jobId = applyingFor[0]

    // Fetch job to get job name for roleKey
    const jobRecords = await base("Jobs")
      .select({
        filterByFormula: `RECORD_ID() = '${jobId}'`,
        fields: [FIELD_JOB_TITLE],
        maxRecords: 1
      })
      .firstPage()

    if (!jobRecords?.[0]) {
      return new Response(JSON.stringify({ error: "Linked job not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      })
    }

    const jobName = jobRecords[0].get(FIELD_JOB_TITLE) || "Unknown Job"
    const roleKey = body.roleKey || generateRoleKey(jobName)

    // Build template data
    let templateData
    if (body.version === 1 && body.type === "preappraisal") {
      // Full structure passed
      const validation = validateQuestionsJSON(body)
      if (!validation.valid) {
        return new Response(JSON.stringify({ error: validation.error }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        })
      }
      templateData = {
        ...validation.data,
        roleKey,
        updatedAt: new Date().toISOString(),
        questions: normalizeQuestions(validation.data.questions)
      }
    } else if (Array.isArray(body.questions)) {
      // Just questions array passed
      templateData = createQuestionsJSON(roleKey, body.questions)
    } else {
      return new Response(JSON.stringify({
        error: "Invalid body - expected { questions: [...] } or full JSON structure"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      })
    }

    // Save to Jobs table
    const jsonString = JSON.stringify(templateData)
    await base("Jobs").update([{
      id: jobId,
      fields: { [FIELD_JOB_TEMPLATE]: jsonString }
    }])

    return new Response(JSON.stringify({
      success: true,
      jobId,
      jobName,
      template: templateData
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  } catch (error) {
    logger?.error?.("POST appraisal-template failed", error)
    return new Response(JSON.stringify({ error: "Failed to save appraisal template" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
}
