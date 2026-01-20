import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import logger from "@/lib/utils/logger"
import { logAuditEvent } from "@/lib/auditLogger"
import { createNotification } from "@/lib/notifications"
import { parseAirtableQuestionsField } from "@/lib/utils/appraisal-questions"

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

// Airtable field names (from ATS_schema.json)
// Note: Using field NAMES for better compatibility with Airtable JS SDK
const FIELD_APPRAISAL_DATE = "Appraisal Date" // fldub0zVNjd0Skkly
const FIELD_APPRAISAL_HISTORY = "Appraisal History" // fldrnRVH15LptSFzV
const FIELD_QUESTIONS_OVERRIDE = "Preappraisal Questions Override (JSON)" // fldCmnvIXn1o2nDrx

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
    const dateStr = String(body?.date || "").trim() // expects YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return new Response(JSON.stringify({ error: "Invalid date format (expected YYYY-MM-DD)" }), { status: 400, headers: { "Content-Type": "application/json" } })
    }

    // Build stringified JSON for 'Appraisal History' and merge with existing if present
    const nowIso = new Date().toISOString()
    const appraisalDateIso = new Date(`${dateStr}T09:00:00Z`).toISOString()
    const year = Number(dateStr.slice(0, 4))

    let historyString
    let historyObj

    const STEP_ORDER = [
      { id: "set_appraisal_date", label: "Set Appraisal Date" },
      { id: "sent_pre_appraisal_form", label: "2 weeks before appraisal date: Send Pre-Appraisal Form" },
      { id: "sent_finalised_action_plan", label: "2 days after appraisal date: Send Finalised Action Plan + Goals" },
    ]
    try {
      const records = await base("Applicants")
        .select({ 
          filterByFormula: `RECORD_ID() = '${id}'`, 
          fields: [FIELD_APPRAISAL_HISTORY, FIELD_QUESTIONS_OVERRIDE], 
          maxRecords: 1 
        })
        .firstPage()

      const existingHistoryRaw = records?.[0]?.get?.(FIELD_APPRAISAL_HISTORY)
      
      // Get current questions override for snapshot
      const questionsOverrideRaw = records?.[0]?.get?.(FIELD_QUESTIONS_OVERRIDE)
      let questionsSnapshot = null
      if (questionsOverrideRaw) {
        const parsed = parseAirtableQuestionsField(questionsOverrideRaw)
        if (parsed.success) {
          questionsSnapshot = parsed.data
        }
      }

      if (existingHistoryRaw && typeof existingHistoryRaw === "string" && existingHistoryRaw.trim()) {
        try {
          historyObj = JSON.parse(existingHistoryRaw)
        } catch {
          historyObj = null
        }
      }

      if (historyObj && Array.isArray(historyObj.appraisals)) {
        const idx = historyObj.appraisals.findIndex((a) => Number(a?.year) === year)
        if (idx >= 0) {
          const existing = historyObj.appraisals[idx] || {}
          const updated = {
            ...existing,
            year,
            appraisalDate: appraisalDateIso,
          }
          const existingSteps = Array.isArray(existing.steps) ? existing.steps : []
          const existingById = new Map(existingSteps.map((s) => [s?.id, s]))
          const mergedSteps = STEP_ORDER.map((def) => {
            const prev = existingById.get(def.id) || {}
            if (def.id === "set_appraisal_date") {
              return { id: def.id, label: def.label, completedAt: nowIso }
            }
            return { id: def.id, label: def.label, completedAt: prev.completedAt || null }
          })
          updated.steps = mergedSteps
          updated.createdAt = existing.createdAt || nowIso
          updated.updatedAt = nowIso
          // Store questions snapshot if available
          if (questionsSnapshot) {
            updated.preappraisalQuestions = questionsSnapshot
          }
          historyObj.appraisals[idx] = updated
        } else {
          const steps = STEP_ORDER.map((def) => ({
            id: def.id,
            label: def.label,
            completedAt: def.id === "set_appraisal_date" ? nowIso : null,
          }))
          const newEntry = { year, appraisalDate: appraisalDateIso, steps, createdAt: nowIso, updatedAt: nowIso }
          // Store questions snapshot if available
          if (questionsSnapshot) {
            newEntry.preappraisalQuestions = questionsSnapshot
          }
          historyObj.appraisals.push(newEntry)
        }
      } else {
        const steps = STEP_ORDER.map((def) => ({
          id: def.id,
          label: def.label,
          completedAt: def.id === "set_appraisal_date" ? nowIso : null,
        }))
        const newEntry = { year, appraisalDate: appraisalDateIso, steps, createdAt: nowIso, updatedAt: nowIso }
        // Store questions snapshot if available
        if (questionsSnapshot) {
          newEntry.preappraisalQuestions = questionsSnapshot
        }
        historyObj = { appraisals: [newEntry] }
      }

      historyString = JSON.stringify(historyObj)
    } catch (e) {
      logger?.error?.("failed to construct Appraisal History JSON", e)
    }

    // Update Applicants.'Appraisal Date' and 'Appraisal History' (if built)
    const fieldsToUpdate = { [FIELD_APPRAISAL_DATE]: dateStr }
    if (historyString) fieldsToUpdate[FIELD_APPRAISAL_HISTORY] = historyString
    await base("Applicants").update([{ id, fields: fieldsToUpdate }])

    try {
      await logAuditEvent({
        eventType: "Appraisal Date Update",
        eventStatus: "Success",
        userName: session.userName,
        userRole: session.userRole,
        userIdentifier: session.userEmail,
        detailedMessage: `Set Appraisal Date to ${dateStr} for applicant ${id}`,
        request
      })
    } catch (e) {
      logger?.error?.("audit log failed for appraisal date update", e)
    }

    // Notify acting staff (if Staff record exists)
    try {
      const staffRecs = await base("Staff").select({ filterByFormula: `{Email}='${String(session.userEmail).toLowerCase()}'`, maxRecords: 1 }).firstPage()
      const staff = staffRecs?.[0]
      if (staff) {
        await createNotification({
          title: "Appraisal Date Updated",
          body: `Appraisal set to ${dateStr}. An appointment event has been created in the calendar.`,
          type: "Appraisal",
          severity: "Info",
          recipientId: staff.id,
          actionUrl: "/admin/users",
          source: "Applicant Drawer",
        })
      }
    } catch (e) {
      logger?.error?.("createNotification failed for appraisal date update", e)
    }

    return new Response(JSON.stringify({ success: true, id, appraisalDate: dateStr }), { status: 200, headers: { "Content-Type": "application/json" } })
  } catch (error) {
    logger?.error?.("appraisal date update failed", error)
    return new Response(JSON.stringify({ error: "Failed to update appraisal date" }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
}


