import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import { joinOptionsArray, splitOptionsString } from "@/src/lib/quiz/options"

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

export async function PUT(request, { params }) {
  try {
    const cookieStore = await cookies()
    const sealedSession = cookieStore.get("session")?.value
    if (!sealedSession) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { "Content-Type": "application/json" } })
    const session = await unsealData(sealedSession, { password: process.env.SESSION_SECRET })
    if (!session || session.userRole !== "admin") return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } })

    const { itemId } = await params
    if (!itemId) return new Response(JSON.stringify({ error: "itemId required" }), { status: 400, headers: { "Content-Type": "application/json" } })

    const body = await request.json().catch(() => ({}))
    const fields = {}
    if (typeof body.type === "string") fields["Type"] = body.type
    if (typeof body.qType === "string") fields["Q.Type"] = body.qType
    if (typeof body.content === "string") fields["Content"] = body.content
    if (typeof body.options !== "undefined") {
      if (Array.isArray(body.options)) fields["Options"] = joinOptionsArray(body.options)
      else fields["Options"] = String(body.options || "")
    }
    if (typeof body.correctAnswer !== "undefined") fields["Correct Answer"] = String(body.correctAnswer || "")
    if (typeof body.order !== "undefined") fields["Order"] = Number(body.order)
    if (typeof body.points !== "undefined") fields["Points"] = Number(body.points)

    await base("Onboarding Quiz Items").update([{ id: itemId, fields }])
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } })
  } catch (e) {
    return new Response(JSON.stringify({ error: "Failed to update item" }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
}


