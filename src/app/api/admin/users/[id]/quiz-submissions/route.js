import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import logger from "@/lib/utils/logger"

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

export async function GET(request, { params }) {
  try {
    const { id } = await params
    if (!id) return new Response(JSON.stringify({ error: "Applicant ID required" }), { status: 400, headers: { "Content-Type": "application/json" } })

    const cookieStore = await cookies()
    const sealedSession = cookieStore.get("session")?.value
    if (!sealedSession) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { "Content-Type": "application/json" } })
    const session = await unsealData(sealedSession, { password: process.env.SESSION_SECRET })
    if (!session || session.userRole !== "admin") return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } })

    // Fetch applicant to get linked submission record IDs (more reliable than filterByFormula on links)
    // Get applicant primary field value (Applicants primary field is Email per ATS_schema)
    const applicant = await base("Applicants").find(id).catch(() => null)
    const applicantEmail = applicant?.get("Email")
    if (!applicant || !applicantEmail) {
      return new Response(JSON.stringify({ submissions: [], questionsById: {} }), { status: 200, headers: { "Content-Type": "application/json" } })
    }

    // Linked field returns primary field values in formulas, so match on Email
    const safeEmail = String(applicantEmail).replace(/'/g, "\\'")
    const submissions = await base("Onboarding Quiz Submissions").select({
      filterByFormula: `FIND('${safeEmail}', ARRAYJOIN({Applicants}))`,
      sort: [{ field: "Submission Timestamp", direction: "desc" }],
      fields: ["Quiz Title", "Score", "Total Form Score", "Passed?", "Submission Timestamp", "Answers"],
    }).all()

    // Gather question ids from all answers
    const questionIdsSet = new Set()
    const parsedSubs = submissions.map((rec) => {
      const answersRaw = rec.get("Answers")
      let answers = {}
      try { answers = answersRaw ? JSON.parse(String(answersRaw)) : {} } catch { answers = {} }
      Object.keys(answers || {}).forEach((qid) => questionIdsSet.add(qid))
      return {
        id: rec.id,
        quizTitle: rec.get("Quiz Title") || "Quiz",
        score: Number(rec.get("Score") || 0),
        totalScore: Number(rec.get("Total Form Score") || 0),
        passed: !!rec.get("Passed?"),
        submittedAt: rec.get("Submission Timestamp") || null,
        answers,
      }
    })

    // Batch fetch questions from Onboarding Quiz Items
    const questionIds = Array.from(questionIdsSet)
    const questionsById = {}
    if (questionIds.length > 0) {
      const chunkSize = 50
      for (let i = 0; i < questionIds.length; i += chunkSize) {
        const chunk = questionIds.slice(i, i + chunkSize)
        const orFormula = chunk.length === 1
          ? `RECORD_ID() = '${chunk[0]}'`
          : `OR(${chunk.map((rid) => `RECORD_ID() = '${rid}'`).join(",")})`
        try {
          const qrecs = await base("Onboarding Quiz Items").select({
            filterByFormula: orFormula,
            fields: ["Content"],
          }).all()
          for (const qr of qrecs) {
            questionsById[qr.id] = { content: qr.get("Content") || "" }
          }
        } catch (e) {
          logger?.error?.("Failed to fetch quiz items chunk", e)
        }
      }
    }

    return new Response(JSON.stringify({ submissions: parsedSubs, questionsById }), { status: 200, headers: { "Content-Type": "application/json" } })
  } catch (error) {
    logger?.error?.("quiz submissions fetch failed", error)
    return new Response(JSON.stringify({ error: "Failed to fetch quiz submissions" }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
}


