import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import logger from "@/lib/utils/logger"
import { logAuditEvent } from "@/lib/auditLogger"
import { createNotification } from "@/lib/notifications"

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
    try {
      const records = await base("Applicants")
        .select({ filterByFormula: `RECORD_ID() = '${id}'`, fields: ["Appraisal History"], maxRecords: 1 })
        .firstPage()

      const existingHistoryRaw = records?.[0]?.get?.("Appraisal History")

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
          const steps = Array.isArray(existing.steps) ? existing.steps.slice() : []
          steps.push({ id: "set_appraisal_date", label: "Set Appraisal Date", completedAt: nowIso })
          updated.steps = steps
          updated.createdAt = existing.createdAt || nowIso
          updated.updatedAt = nowIso
          historyObj.appraisals[idx] = updated
        } else {
          historyObj.appraisals.push({
            year,
            appraisalDate: appraisalDateIso,
            steps: [{ id: "set_appraisal_date", label: "Set Appraisal Date", completedAt: nowIso }],
            createdAt: nowIso,
            updatedAt: nowIso,
          })
        }
      } else {
        historyObj = {
          appraisals: [
            {
              year,
              appraisalDate: appraisalDateIso,
              steps: [{ id: "set_appraisal_date", label: "Set Appraisal Date", completedAt: nowIso }],
              createdAt: nowIso,
              updatedAt: nowIso,
            },
          ],
        }
      }

      historyString = JSON.stringify(historyObj)
    } catch (e) {
      logger?.error?.("failed to construct Appraisal History JSON", e)
    }

    // Update Applicants.'Appraisal Date' and 'Appraisal History' (if built)
    const fieldsToUpdate = { "Appraisal Date": dateStr }
    if (historyString) fieldsToUpdate["Appraisal History"] = historyString
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


