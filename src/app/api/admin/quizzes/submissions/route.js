import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import logger from "@/lib/utils/logger"

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

function buildFilterFormula(q) {
  const clauses = []

  // applicantId -> fetch email and later inject exact FIND on Applicants linked field
  // quizId -> FIND on linked quizzes field text representation
  if (q.passed === "true") clauses.push(`{Passed?} = 'Passed'`)
  if (q.passed === "false") clauses.push(`{Passed?} = 'Failed'`)

  if (q.minScore) clauses.push(`{Score} >= ${Number(q.minScore)}`)
  if (q.maxScore) clauses.push(`{Score} <= ${Number(q.maxScore)}`)

  if (q.week) clauses.push(`FIND('${String(q.week)}', ARRAYJOIN({Onboarding - Quizzes}))`) // weak, but placeholder until explicit Week is rolled up

  // Date filtering
  if (q.from && q.to && q.from === q.to) {
    // Single day selection - match by day
    clauses.push(`IS_SAME({Submission Timestamp}, DATETIME_PARSE('${q.from}'), 'day')`)
  } else {
    if (q.from) clauses.push(`IS_AFTER({Submission Timestamp}, DATETIME_PARSE('${q.from}'))`)
    if (q.to) clauses.push(`IS_BEFORE({Submission Timestamp}, DATEADD(DATETIME_PARSE('${q.to}'), 1, 'day'))`) // inclusive to end of 'to' day
  }

  // crude search over Quiz Title
  if (q.search) {
    const safe = String(q.search).replace(/'/g, "\\'")
    clauses.push(`FIND(LOWER('${safe}'), LOWER({Quiz Title}))`)
  }

  if (clauses.length === 0) return ""
  if (clauses.length === 1) return clauses[0]
  return `AND(${clauses.join(",")})`
}

export async function GET(request) {
  try {
    const cookieStore = await cookies()
    const sealedSession = cookieStore.get("session")?.value
    if (!sealedSession) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { "Content-Type": "application/json" } })
    const session = await unsealData(sealedSession, { password: process.env.SESSION_SECRET })
    if (!session || session.userRole !== "admin") return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } })

    const { searchParams } = new URL(request.url)
    const q = Object.fromEntries(searchParams.entries())

    // Build base filter
    let formula = buildFilterFormula(q)

    // Applicant filter (by ID -> get Email -> FIND in Applicants linked field text)
    if (q.applicantId) {
      try {
        const applicant = await base("Applicants").find(String(q.applicantId))
        const email = applicant?.get("Email")
        if (email) {
          const safeEmail = String(email).replace(/'/g, "\\'")
          const clause = `FIND('${safeEmail}', ARRAYJOIN({Applicants}))`
          formula = formula ? `AND(${formula}, ${clause})` : clause
        }
      } catch {}
    }

    // Quiz filter
    if (q.quizId) {
      const safeQuizId = String(q.quizId).replace(/'/g, "\\'")
      const clause = `FIND('${safeQuizId}', ARRAYJOIN({Onboarding - Quizzes}))`
      formula = formula ? `AND(${formula}, ${clause})` : clause
    }

    const pageSize = Math.min(Number(q.limit || 50), 100)
    const offset = q.offset || undefined

    const selectConfig = {
      pageSize,
      sort: [{ field: "Submission Timestamp", direction: "desc" }],
      fields: ["Quiz Title", "Score", "Total Form Score", "Passed?", "Submission Timestamp", "Respondent Email", "Answers"],
    }
    if (formula) selectConfig.filterByFormula = formula
    if (offset) selectConfig.offset = offset

    const page = await base("Onboarding Quiz Submissions").select(selectConfig).firstPage().catch(async (err) => {
      // When using firstPage(), Airtable SDK ignores offset; fallback to .select().eachPage for proper pagination when offset is given
      if (!offset) throw err
      const records = []
      let nextOffset = offset
      await base("Onboarding Quiz Submissions").select({ ...selectConfig, offset: nextOffset }).eachPage((recs, fetchNextPage) => {
        records.push(...recs)
        fetchNextPage()
      })
      return records
    })

    // Extract answers and collect question ids to fetch question content
    const questionIdsSet = new Set()
    const submissions = page.map((rec) => {
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
        respondentEmail: rec.get("Respondent Email") || null,
        answers,
      }
    })

    // Batch fetch question content
    const questionsById = {}
    const qids = Array.from(questionIdsSet)
    if (qids.length > 0) {
      const chunkSize = 50
      for (let i = 0; i < qids.length; i += chunkSize) {
        const chunk = qids.slice(i, i + chunkSize)
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
          logger?.error?.("Failed to fetch question chunk", e)
        }
      }
    }

    // Note: Airtable SDK returns offset via eachPage callback; with firstPage we won't get nextOffset
    // For now, do not expose nextOffset when using firstPage (simple pages). Advanced pagination can be added later.
    return new Response(JSON.stringify({ submissions, questionsById }), { status: 200, headers: { "Content-Type": "application/json" } })
  } catch (error) {
    logger?.error?.("admin quizzes submissions fetch failed", error)
    return new Response(JSON.stringify({ error: "Failed to fetch submissions" }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
}


