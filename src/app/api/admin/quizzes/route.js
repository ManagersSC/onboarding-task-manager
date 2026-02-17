import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import { joinOptionsArray } from "@/lib/quiz/options"

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

async function getAdminSession() {
  const cookieStore = await cookies()
  const sealedSession = cookieStore.get("session")?.value
  if (!sealedSession) return null
  const session = await unsealData(sealedSession, { password: process.env.SESSION_SECRET })
  if (!session || session.userRole !== "admin") return null
  return session
}

export async function GET() {
  try {
    const session = await getAdminSession()
    if (!session) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } })

    const records = await base("Onboarding Quizzes").select({
      fields: ["Quiz Title", "Passing Score", "Page Title", "Week"]
    }).all()

    const quizzes = records.map((r) => ({
      id: r.id,
      title: r.get("Quiz Title") || "",
      passingScore: r.get("Passing Score") ?? null,
      pageTitle: r.get("Page Title") || "",
      week: r.get("Week") ?? null
    }))

    return new Response(JSON.stringify({ quizzes }), { status: 200, headers: { "Content-Type": "application/json" } })
  } catch (e) {
    return new Response(JSON.stringify({ error: "Failed to fetch quizzes" }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
}

export async function POST(request) {
  try {
    const session = await getAdminSession()
    if (!session) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } })

    const body = await request.json().catch(() => ({}))
    const { title, pageTitle, passingScore, week, items } = body

    if (!title || typeof title !== "string" || !title.trim()) {
      return new Response(JSON.stringify({ error: "Quiz title is required" }), { status: 400, headers: { "Content-Type": "application/json" } })
    }

    // Create the quiz record
    const quizFields = { "Quiz Title": title.trim() }
    if (typeof pageTitle === "string" && pageTitle.trim()) quizFields["Page Title"] = pageTitle.trim()
    if (typeof passingScore === "number" && Number.isFinite(passingScore)) quizFields["Passing Score"] = passingScore
    if (typeof week === "number" && Number.isFinite(week) && week >= 1) quizFields["Week"] = week

    const quizRecord = await base("Onboarding Quizzes").create([{ fields: quizFields }])
    const quizId = quizRecord[0].id

    // Create quiz items if provided
    if (Array.isArray(items) && items.length > 0) {
      const itemRecords = items.map((it, idx) => {
        const isInfo = String(it.type || "").toLowerCase() === "information"
        const fields = {
          "Quiz Link": [quizId],
          "Type": it.type || "Question",
          "Content": it.content || "",
          "Order": typeof it.order === "number" ? it.order : idx + 1
        }
        if (!isInfo) {
          fields["Q.Type"] = it.qType || "Radio"
          if (Array.isArray(it.options)) fields["Options"] = joinOptionsArray(it.options)
          if (typeof it.correctAnswer === "string") fields["Correct Answer"] = it.correctAnswer
          if (typeof it.points === "number") fields["Points"] = it.points
        }
        return { fields }
      })

      // Airtable allows up to 10 creates per request; chunk
      const chunkSize = 10
      for (let i = 0; i < itemRecords.length; i += chunkSize) {
        await base("Onboarding Quiz Items").create(itemRecords.slice(i, i + chunkSize))
      }
    }

    return new Response(JSON.stringify({ ok: true, quizId }), { status: 201, headers: { "Content-Type": "application/json" } })
  } catch (e) {
    return new Response(JSON.stringify({ error: "Failed to create quiz" }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
}


