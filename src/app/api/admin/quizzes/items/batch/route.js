import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import Airtable from "airtable"

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

export async function POST(request) {
  try {
    const cookieStore = await cookies()
    const sealedSession = cookieStore.get("session")?.value
    if (!sealedSession) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { "Content-Type": "application/json" } })
    const session = await unsealData(sealedSession, { password: process.env.SESSION_SECRET })
    if (!session || session.userRole !== "admin") return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } })

    const body = await request.json().catch(() => ({}))
    const items = Array.isArray(body?.items) ? body.items : []
    if (items.length === 0) return new Response(JSON.stringify({ error: "items required" }), { status: 400, headers: { "Content-Type": "application/json" } })

    const updates = items.map((it) => ({ id: it.id, fields: { Order: Number(it.order) } }))
    // Airtable allows up to 10 updates per request; chunk
    const chunkSize = 10
    for (let i = 0; i < updates.length; i += chunkSize) {
      await base("Onboarding Quiz Items").update(updates.slice(i, i + chunkSize))
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } })
  } catch (e) {
    return new Response(JSON.stringify({ error: "Batch update failed" }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
}


