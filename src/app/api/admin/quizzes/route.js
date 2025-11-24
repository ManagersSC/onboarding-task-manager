import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import Airtable from "airtable"

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

export async function GET() {
  try {
    const cookieStore = await cookies()
    const sealedSession = cookieStore.get("session")?.value
    if (!sealedSession) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { "Content-Type": "application/json" } })
    const session = await unsealData(sealedSession, { password: process.env.SESSION_SECRET })
    if (!session || session.userRole !== "admin") return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } })

    const records = await base("Onboarding Quizzes").select({
      fields: ["Quiz Title", "Passing Score", "Page Title"]
    }).all()

    const quizzes = records.map((r) => ({
      id: r.id,
      title: r.get("Quiz Title") || "",
      passingScore: r.get("Passing Score") ?? null,
      pageTitle: r.get("Page Title") || ""
    }))

    return new Response(JSON.stringify({ quizzes }), { status: 200, headers: { "Content-Type": "application/json" } })
  } catch (e) {
    return new Response(JSON.stringify({ error: "Failed to fetch quizzes" }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
}


