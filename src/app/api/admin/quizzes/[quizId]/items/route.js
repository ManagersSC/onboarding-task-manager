import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import Airtable from "airtable"

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

export async function GET(request, { params }) {
  try {
    const cookieStore = await cookies()
    const sealedSession = cookieStore.get("session")?.value
    if (!sealedSession) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { "Content-Type": "application/json" } })
    const session = await unsealData(sealedSession, { password: process.env.SESSION_SECRET })
    if (!session || session.userRole !== "admin") return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } })

    const { quizId } = await params
    if (!quizId) return new Response(JSON.stringify({ error: "quizId required" }), { status: 400, headers: { "Content-Type": "application/json" } })

    // Filter by Quiz ID lookup field
    const safe = String(quizId).replace(/'/g, "\\'")
    const items = await base("Onboarding Quiz Items").select({
      filterByFormula: `FIND('${safe}', ARRAYJOIN({Quiz ID}))`,
      fields: ["Type", "Q.Type", "Content", "Options", "Correct Answer", "Order", "Points"]
    }).all()

    const nodes = items.map((r) => ({
      id: r.id,
      type: r.get("Type") || "Question",
      qType: r.get("Q.Type") || "Radio",
      content: r.get("Content") || "",
      options: r.get("Options") || "",
      correctAnswer: r.get("Correct Answer") || "",
      order: r.get("Order") ?? null,
      points: r.get("Points") ?? null
    }))

    return new Response(JSON.stringify({ items: nodes }), { status: 200, headers: { "Content-Type": "application/json" } })
  } catch (e) {
    return new Response(JSON.stringify({ error: "Failed to fetch items" }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
}


