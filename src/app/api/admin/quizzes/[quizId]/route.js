import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import Airtable from "airtable"

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

export async function PUT(request, { params }) {
  try {
    const cookieStore = await cookies()
    const sealedSession = cookieStore.get("session")?.value
    if (!sealedSession) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { "Content-Type": "application/json" } })
    const session = await unsealData(sealedSession, { password: process.env.SESSION_SECRET })
    if (!session || session.userRole !== "admin") return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } })

    const { quizId } = await params
    if (!quizId) return new Response(JSON.stringify({ error: "quizId required" }), { status: 400, headers: { "Content-Type": "application/json" } })

    const body = await request.json().catch(() => ({}))
    const patch = {}
    if (typeof body.pageTitle === "string") patch["Page Title"] = body.pageTitle
    if (typeof body.passingScore !== "undefined" && body.passingScore !== null && body.passingScore !== "") {
      patch["Passing Score"] = Number(body.passingScore)
    }
    if (Object.keys(patch).length === 0) {
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } })
    }

    await base("Onboarding Quizzes").update([{ id: quizId, fields: patch }])
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } })
  } catch (e) {
    return new Response(JSON.stringify({ error: "Failed to update quiz" }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
}

export async function DELETE(request, { params }) {
  try {
    const cookieStore = await cookies()
    const sealedSession = cookieStore.get("session")?.value
    if (!sealedSession) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { "Content-Type": "application/json" } })
    const session = await unsealData(sealedSession, { password: process.env.SESSION_SECRET })
    if (!session || session.userRole !== "admin") return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } })

    const { quizId } = await params
    if (!quizId) return new Response(JSON.stringify({ error: "quizId required" }), { status: 400, headers: { "Content-Type": "application/json" } })

    // Delete associated quiz items first
    const safe = String(quizId).replace(/'/g, "\\'")
    const items = await base("Onboarding Quiz Items").select({
      filterByFormula: `FIND('${safe}', ARRAYJOIN({Quiz ID}))`,
      fields: []
    }).all()

    if (items.length > 0) {
      const chunkSize = 10
      const itemIds = items.map((r) => r.id)
      for (let i = 0; i < itemIds.length; i += chunkSize) {
        await base("Onboarding Quiz Items").destroy(itemIds.slice(i, i + chunkSize))
      }
    }

    // Delete the quiz record
    await base("Onboarding Quizzes").destroy([quizId])

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } })
  } catch (e) {
    return new Response(JSON.stringify({ error: "Failed to delete quiz" }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
}


