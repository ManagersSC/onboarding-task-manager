import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import logger from "@/lib/utils/logger"

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

export async function POST(request, { params }) {
  try {
    const { id } = await params
    if (!id) return new Response(JSON.stringify({ error: "Applicant ID required" }), { status: 400, headers: { "Content-Type": "application/json" } })

    const cookieStore = await cookies()
    const sealedSession = cookieStore.get("session")?.value
    if (!sealedSession) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { "Content-Type": "application/json" } })
    const session = await unsealData(sealedSession, { password: process.env.SESSION_SECRET })
    if (!session || session.userRole !== "admin") return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } })

    const body = await request.json().catch(() => ({}))
    const stepId = String(body?.stepId || "sent_finalised_action_plan")
    const nowIso = new Date().toISOString()

    // Read Appraisal History
    const records = await base("Applicants")
      .select({ filterByFormula: `RECORD_ID() = '${id}'`, fields: ["Appraisal History"], maxRecords: 1 })
      .firstPage()
    if (!records?.[0]) {
      return new Response(JSON.stringify({ error: "Applicant not found" }), { status: 404, headers: { "Content-Type": "application/json" } })
    }
    const existingHistoryRaw = records[0].get("Appraisal History")

    let historyObj
    if (existingHistoryRaw && typeof existingHistoryRaw === "string" && existingHistoryRaw.trim()) {
      try { historyObj = JSON.parse(existingHistoryRaw) } catch { historyObj = null }
    }
    if (!historyObj || !Array.isArray(historyObj.appraisals) || historyObj.appraisals.length === 0) {
      return new Response(JSON.stringify({ error: "No existing appraisal history to update" }), { status: 400, headers: { "Content-Type": "application/json" } })
    }

    // Pick the most recent appraisal entry (by appraisalDate or updatedAt)
    const sorted = [...historyObj.appraisals].sort(
      (a, b) => new Date(b?.appraisalDate || b?.updatedAt || 0) - new Date(a?.appraisalDate || a?.updatedAt || 0)
    )
    const target = sorted[0]
    const idx = historyObj.appraisals.findIndex((a) => a === target)
    const steps = Array.isArray(target.steps) ? target.steps : []
    const byId = new Map(steps.map((s) => [s?.id, s]))

    const existing = byId.get(stepId) || {}
    const updatedStep = { id: stepId, label: existing?.label || existing?.id || stepId, completedAt: nowIso }
    const nextSteps = steps.map((s) => (s?.id === stepId ? updatedStep : s))
    if (!byId.has(stepId)) nextSteps.push(updatedStep)

    const updatedEntry = {
      ...target,
      steps: nextSteps,
      updatedAt: nowIso,
    }
    historyObj.appraisals[idx] = updatedEntry

    await base("Applicants").update([{ id, fields: { "Appraisal History": JSON.stringify(historyObj) } }])

    return new Response(JSON.stringify({ success: true, id, updatedStep: stepId, updatedAt: nowIso }), { status: 200, headers: { "Content-Type": "application/json" } })
  } catch (error) {
    logger?.error?.("appraisal history step update failed", error)
    return new Response(JSON.stringify({ error: "Failed to update appraisal step" }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
}


