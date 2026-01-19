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

// Airtable field IDs (from ATS_schema.json)
// Applicants table
const FIELD_OVERRIDE = "fldCmnvIXn1o2nDrx" // "Preappraisal Questions Override (JSON)"
const FIELD_EFFECTIVE = "fldHKo0Qwki2hba7K" // "Preappraisal Questions Effective (JSON)"
const FIELD_APPLYING_FOR = "fld2kd9SxfdltFVwW" // "Applying For" - link to Jobs
// Jobs table
const FIELD_JOB_TITLE = "fldTvEi44E8tSTsWL" // "Title" - primary field (job name)

/**
 * GET /api/admin/users/[id]/appraisal-questions
 * Returns the effective (resolved) questions for an applicant
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

    // Fetch applicant record
    const records = await base("Applicants")
      .select({
        filterByFormula: `RECORD_ID() = '${id}'`,
        fields: [FIELD_OVERRIDE, FIELD_EFFECTIVE, FIELD_APPLYING_FOR],
        maxRecords: 1
      })
      .firstPage()

    if (!records?.[0]) {
      return new Response(JSON.stringify({ error: "Applicant not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      })
    }

    const record = records[0]
    const effectiveRaw = record.get(FIELD_EFFECTIVE)
    const overrideRaw = record.get(FIELD_OVERRIDE)
    const applyingFor = record.get(FIELD_APPLYING_FOR)

    // Try to parse effective questions (formula field returns override if exists, else template)
    const effectiveResult = parseAirtableQuestionsField(effectiveRaw)
    
    // Determine source
    const hasOverride = overrideRaw && String(overrideRaw).trim().length > 0
    const source = hasOverride ? "override" : "template"

    if (effectiveResult.success) {
      return new Response(JSON.stringify({
        success: true,
        source,
        hasOverride,
        questions: effectiveResult.data
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    }

    // No valid questions found - return empty structure
    // Try to get job name for roleKey
    let roleKey = "unknown"
    if (applyingFor && applyingFor.length > 0) {
      try {
        const jobRecords = await base("Jobs")
          .select({
            filterByFormula: `RECORD_ID() = '${applyingFor[0]}'`,
            fields: [FIELD_JOB_TITLE],
            maxRecords: 1
          })
          .firstPage()
        if (jobRecords?.[0]) {
          roleKey = generateRoleKey(jobRecords[0].get(FIELD_JOB_TITLE))
        }
      } catch (e) {
        logger?.warn?.("Failed to fetch job name for roleKey", e)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      source: "empty",
      hasOverride: false,
      questions: {
        version: 1,
        type: "preappraisal",
        roleKey,
        updatedAt: new Date().toISOString(),
        questions: []
      },
      warning: effectiveResult.error || "No questions found"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  } catch (error) {
    logger?.error?.("GET appraisal-questions failed", error)
    return new Response(JSON.stringify({ error: "Failed to fetch appraisal questions" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
}

/**
 * POST /api/admin/users/[id]/appraisal-questions
 * Save applicant override questions
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

    // Fetch applicant to get linked job for roleKey
    const records = await base("Applicants")
      .select({
        filterByFormula: `RECORD_ID() = '${id}'`,
        fields: [FIELD_APPLYING_FOR],
        maxRecords: 1
      })
      .firstPage()

    if (!records?.[0]) {
      return new Response(JSON.stringify({ error: "Applicant not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      })
    }

    const applyingFor = records[0].get(FIELD_APPLYING_FOR)

    // Determine roleKey from linked job
    let roleKey = body.roleKey || "unknown"
    if (!body.roleKey && applyingFor && applyingFor.length > 0) {
      try {
        const jobRecords = await base("Jobs")
          .select({
            filterByFormula: `RECORD_ID() = '${applyingFor[0]}'`,
            fields: [FIELD_JOB_TITLE],
            maxRecords: 1
          })
          .firstPage()
        if (jobRecords?.[0]) {
          roleKey = generateRoleKey(jobRecords[0].get(FIELD_JOB_TITLE))
        }
      } catch (e) {
        logger?.warn?.("Failed to fetch job name for roleKey", e)
      }
    }

    // Accept either full JSON structure or just questions array
    let questionsData
    if (body.version === 1 && body.type === "preappraisal") {
      // Full structure passed
      const validation = validateQuestionsJSON(body)
      if (!validation.valid) {
        return new Response(JSON.stringify({ error: validation.error }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        })
      }
      questionsData = {
        ...validation.data,
        roleKey: body.roleKey || roleKey,
        updatedAt: new Date().toISOString(),
        questions: normalizeQuestions(validation.data.questions)
      }
    } else if (Array.isArray(body.questions)) {
      // Just questions array passed
      questionsData = createQuestionsJSON(roleKey, body.questions)
    } else {
      return new Response(JSON.stringify({
        error: "Invalid body - expected { questions: [...] } or full JSON structure"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      })
    }

    // Save to Airtable
    const jsonString = JSON.stringify(questionsData)
    await base("Applicants").update([{
      id,
      fields: { [FIELD_OVERRIDE]: jsonString }
    }])

    return new Response(JSON.stringify({
      success: true,
      id,
      questions: questionsData
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  } catch (error) {
    logger?.error?.("POST appraisal-questions failed", error)
    return new Response(JSON.stringify({ error: "Failed to save appraisal questions" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
}

/**
 * DELETE /api/admin/users/[id]/appraisal-questions
 * Clear applicant override (revert to template)
 */
export async function DELETE(request, { params }) {
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

    // Clear override field
    await base("Applicants").update([{
      id,
      fields: { [FIELD_OVERRIDE]: "" }
    }])

    return new Response(JSON.stringify({
      success: true,
      id,
      message: "Override cleared, will now use template"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  } catch (error) {
    logger?.error?.("DELETE appraisal-questions failed", error)
    return new Response(JSON.stringify({ error: "Failed to clear appraisal questions override" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
}
