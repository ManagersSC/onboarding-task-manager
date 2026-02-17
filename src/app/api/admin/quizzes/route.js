import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import { joinOptionsArray } from "@/lib/quiz/options"
import { logAuditEvent } from "@/lib/auditLogger"

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
  let userEmail, userRole, userName

  try {
    const session = await getAdminSession()
    if (!session) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } })

    userEmail = session.userEmail
    userRole = session.userRole
    userName = session.userName || userEmail?.split("@")[0]

    const body = await request.json().catch(() => ({}))
    const { title, pageTitle, passingScore, week, items } = body

    // Validate all required fields
    const errors = []
    if (!title || typeof title !== "string" || !title.trim()) errors.push("Quiz Title is required")
    if (!pageTitle || typeof pageTitle !== "string" || !pageTitle.trim()) errors.push("Page Title is required")
    if (typeof passingScore !== "number" || !Number.isFinite(passingScore)) errors.push("Passing Score is required")
    if (typeof week !== "number" || !Number.isFinite(week) || week < 1 || week > 5) errors.push("Week (1-5) is required")

    if (errors.length > 0) {
      return new Response(JSON.stringify({ error: errors.join(", ") }), { status: 400, headers: { "Content-Type": "application/json" } })
    }

    // Create the quiz record
    const quizFields = {
      "Quiz Title": title.trim(),
      "Page Title": pageTitle.trim(),
      "Passing Score": passingScore,
      "Week": week
    }

    const quizRecord = await base("Onboarding Quizzes").create([{ fields: quizFields }])
    const quizId = quizRecord[0].id

    // Create quiz items if provided
    const itemCount = Array.isArray(items) ? items.length : 0
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

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d97e23f0-6cbf-4e5b-b880-d53a90811734',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'quizzes/route.js:beforeLogAudit',message:'about to call logAuditEvent Quiz Created Success',data:{quizId},hypothesisId:'H1',timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    await logAuditEvent({
      eventType: "Quiz Created",
      eventStatus: "Success",
      userRole,
      userName,
      userIdentifier: userEmail,
      detailedMessage: `Admin: ${userName}. Quiz created: "${title.trim()}" (Week ${week}) with ${itemCount} item(s). Record ID: ${quizId}`,
      request,
    })

    return new Response(JSON.stringify({ ok: true, quizId }), { status: 201, headers: { "Content-Type": "application/json" } })
  } catch (e) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d97e23f0-6cbf-4e5b-b880-d53a90811734',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'quizzes/route.js:catchBeforeLogAudit',message:'in catch, about to call logAuditEvent Quiz Created Error',data:{errorMessage:e?.message},hypothesisId:'H1',timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    await logAuditEvent({
      eventType: "Quiz Created",
      eventStatus: "Error",
      userRole: userRole || "Unknown",
      userName: userName || "Unknown",
      userIdentifier: userEmail || "Unknown",
      detailedMessage: `Failed to create quiz: ${e?.message || "Unknown error"}`,
      request,
    })
    return new Response(JSON.stringify({ error: "Failed to create quiz" }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
}
