import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import Airtable from "airtable"

// Admin Tasks table field IDs
const F_TASK           = "fldBSR0tivzKCwIYX"  // 📌 Task (title)
const F_DETAIL         = "fld5zfFg0A2Kzfw8W"  // 📖 Task Detail (description)
const F_STATUS         = "fldcOYboUu2vDASCl"  // 🚀 Status
const F_URGENCY        = "fldwLSc95ITdPTA7j"  // 🚨 Urgency (priority)
const F_DUE_DATE       = "fldJ6mb4TsamGXMFh"  // 📆 Due Date
const F_APPLICANT      = "fldo7oJ0uwiwhNzmH"  // 👤 Assigned Applicant
const F_COMPLETED_BY   = "fld7fsKOvSDOQrgqn"  // Completed By (Staff link)
const F_COMPLETED_DATE = "flddxTSDbSiHOD0a2"  // Completed Date
const F_TASK_TYPE      = "fldv9LfTsox0hlbYK"  // Task Type

// Onboarding Tasks Logs field IDs
const OTL_ASSIGNED          = "fldqftlVTfZ5sSkrs"  // Assigned (link to Applicants)
const OTL_STATUS            = "fldhAkbZ1G2WNwTJI"  // Status
const OTL_DISPLAY_TITLE     = "fldaBi63kuqsg3MKZ"  // Display Title (formula — user-facing)
const OTL_TASK_TITLE        = "fldgWWXwNzR1nuskC"  // Task Title (lookup fallback)
const OTL_CUSTOM_TITLE      = "flda5kIZD8vpUiSQd"  // Custom Task Title (for custom tasks)
const OTL_COMPLETED_TIME    = "fld6dfyDnEBKl7Xx2"  // Completed Time
const OTL_VERIFICATION_TASKS = "fld7GzNO0qjuSeHuh" // Links to admin Tasks verification records
const OTL_DISPLAY_TYPE      = "fldAcyUO7zlnq0h7N"  // Display Type (formula)

async function getNames(base, table, ids) {
  if (ids.size === 0) return {}
  const list = Array.from(ids)
  const formula = list.map((id) => `RECORD_ID() = '${id}'`).join(", ")
  const out = {}
  try {
    const page = await base(table)
      .select({ filterByFormula: `OR(${formula})`, fields: ["Name"], pageSize: list.length })
      .firstPage()
    for (const rec of page) out[rec.id] = rec.fields["Name"] || "Unknown"
  } catch {
    // graceful degradation
  }
  return out
}

export async function GET(request, { params }) {
  try {
    const { id } = await params

    if (!id) {
      return new Response(JSON.stringify({ error: "Applicant ID is required" }), { status: 400 })
    }

    // Auth check — admin only
    const cookieStore = await cookies()
    const sealedSession = cookieStore.get("session")?.value
    if (!sealedSession) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 })
    }
    const session = await unsealData(sealedSession, { password: process.env.SESSION_SECRET })
    if (!session || session.userRole !== "admin") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

    // Fetch both tables in parallel for performance
    const [adminTasksRaw, onboardingLogsRaw] = await Promise.all([
      // Admin Tasks: verification tasks linked to this applicant
      base("Tasks")
        .select({
          fields: [F_TASK, F_DETAIL, F_STATUS, F_URGENCY, F_DUE_DATE, F_APPLICANT, F_COMPLETED_BY, F_COMPLETED_DATE, F_TASK_TYPE],
          maxRecords: 200,
          sort: [{ field: F_DUE_DATE, direction: "asc" }],
          returnFieldsByFieldId: true,
        })
        .all(),
      // Onboarding Tasks Logs: tasks the hire completed themselves
      base("Onboarding Tasks Logs")
        .select({
          filterByFormula: `{${OTL_STATUS}} = 'Completed'`,
          fields: [OTL_ASSIGNED, OTL_DISPLAY_TITLE, OTL_TASK_TITLE, OTL_CUSTOM_TITLE, OTL_COMPLETED_TIME, OTL_VERIFICATION_TASKS, OTL_DISPLAY_TYPE],
          maxRecords: 200,
          sort: [{ field: OTL_COMPLETED_TIME, direction: "desc" }],
          returnFieldsByFieldId: true,
        })
        .all(),
    ])

    // Filter admin Tasks to those linked to this applicant
    const adminTaskRecords = adminTasksRaw.filter((r) =>
      Array.isArray(r?.fields?.[F_APPLICANT]) && r.fields[F_APPLICANT].includes(id)
    )

    // Filter Onboarding Tasks Logs to those assigned to this applicant
    const onboardingLogRecords = onboardingLogsRaw.filter((r) =>
      Array.isArray(r?.fields?.[OTL_ASSIGNED]) && r.fields[OTL_ASSIGNED].includes(id)
    )

    // Resolve staff names for "Completed By"
    const staffIds = new Set()
    for (const r of adminTaskRecords) {
      ;(r.fields[F_COMPLETED_BY] || []).forEach((sid) => staffIds.add(sid))
    }
    const staffNameById = await getNames(base, "Staff", staffIds)

    // Bucket admin tasks by status
    const active = []
    const overdue = []
    const completed = []

    for (const r of adminTaskRecords) {
      const rawStatus = (r.fields[F_STATUS] || "").trim().toLowerCase()
      const completedById = (r.fields[F_COMPLETED_BY] || [])[0] || ""
      const task = {
        id: r.id,
        title: r.fields[F_TASK] || "",
        description: r.fields[F_DETAIL] || "",
        status: r.fields[F_STATUS] || "",
        priority: r.fields[F_URGENCY] || "",
        dueDate: r.fields[F_DUE_DATE] || null,
        taskType: r.fields[F_TASK_TYPE] || "",
        completedByName: completedById ? (staffNameById[completedById] || "Unknown") : null,
        completedAt: r.fields[F_COMPLETED_DATE] || null,
      }

      if (rawStatus === "completed") {
        completed.push(task)
      } else if (rawStatus === "overdue" || rawStatus === " overdue") {
        overdue.push(task)
      } else {
        active.push(task)
      }
    }

    // Sort completed by most recent first
    completed.sort((a, b) => {
      if (!a.completedAt && !b.completedAt) return 0
      if (!a.completedAt) return 1
      if (!b.completedAt) return -1
      return new Date(b.completedAt) - new Date(a.completedAt)
    })

    // Build set of admin task IDs that have already been completed (verified)
    const completedAdminTaskIds = new Set(completed.map((t) => t.id))

    // Pending verification: hire-completed onboarding tasks where the admin
    // verification task either doesn't exist yet OR hasn't been completed
    const pendingVerification = onboardingLogRecords
      .filter((r) => {
        const verificationLinks = r.fields[OTL_VERIFICATION_TASKS] || []
        // Exclude if ALL linked verification tasks are already in our completed set
        // (meaning admin has verified this specific task)
        if (verificationLinks.length === 0) return true
        return !verificationLinks.every((vid) => completedAdminTaskIds.has(vid))
      })
      .map((r) => {
        // Resolve title: formula Display Title → lookup Task Title → custom title fallback
        const displayTitle = r.fields[OTL_DISPLAY_TITLE]
        const taskTitleArr = r.fields[OTL_TASK_TITLE]
        const customTitle = r.fields[OTL_CUSTOM_TITLE]
        const title =
          (typeof displayTitle === "string" && displayTitle.trim()) ||
          (Array.isArray(displayTitle) && displayTitle[0]) ||
          (Array.isArray(taskTitleArr) && taskTitleArr[0]) ||
          (typeof customTitle === "string" && customTitle.trim()) ||
          "Untitled Task"

        const displayType = r.fields[OTL_DISPLAY_TYPE]
        const taskType =
          (typeof displayType === "string" && displayType) ||
          (Array.isArray(displayType) && displayType[0]) ||
          ""

        return {
          id: r.id,
          title,
          taskType,
          completedAt: r.fields[OTL_COMPLETED_TIME] || null,
        }
      })

    return new Response(
      JSON.stringify({ active, overdue, completed, pendingVerification }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || "Failed to fetch tasks" }), { status: 500 })
  }
}
