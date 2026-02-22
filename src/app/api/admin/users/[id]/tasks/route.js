import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import Airtable from "airtable"

const F_TASK        = "fldBSR0tivzKCwIYX"  // 📌 Task (title)
const F_DETAIL      = "fld5zfFg0A2Kzfw8W"  // 📖 Task Detail (description)
const F_STATUS      = "fldcOYboUu2vDASCl"  // 🚀 Status
const F_URGENCY     = "fldwLSc95ITdPTA7j"  // 🚨 Urgency (priority)
const F_DUE_DATE    = "fldJ6mb4TsamGXMFh"  // 📆 Due Date
const F_APPLICANT   = "fldo7oJ0uwiwhNzmH"  // 👤 Assigned Applicant
const F_COMPLETED_BY   = "fld7fsKOvSDOQrgqn"  // Completed By (Staff link)
const F_COMPLETED_DATE = "flddxTSDbSiHOD0a2"  // Completed Date
const F_TASK_TYPE      = "fldv9LfTsox0hlbYK"  // Task Type

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
    // graceful degradation — return empty map
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

    // Fetch tasks that have this applicant linked.
    // We scan without an applicant formula filter (Airtable linked-record ID filtering is unreliable)
    // and filter in code. We fetch up to 200 records sorted newest first.
    const fields = [F_TASK, F_DETAIL, F_STATUS, F_URGENCY, F_DUE_DATE, F_APPLICANT, F_COMPLETED_BY, F_COMPLETED_DATE, F_TASK_TYPE]

    const recordsRaw = await base("Tasks")
      .select({
        fields,
        maxRecords: 200,
        sort: [{ field: F_DUE_DATE, direction: "asc" }],
        returnFieldsByFieldId: true,
      })
      .all()

    // Filter to tasks that link to this applicant
    const records = recordsRaw.filter((r) =>
      Array.isArray(r?.fields?.[F_APPLICANT]) && r.fields[F_APPLICANT].includes(id)
    )

    // Resolve staff names for "Completed By"
    const staffIds = new Set()
    for (const r of records) {
      ;(r.fields[F_COMPLETED_BY] || []).forEach((sid) => staffIds.add(sid))
    }
    const staffNameById = await getNames(base, "Staff", staffIds)

    // Map and bucket by status
    const active = []
    const overdue = []
    const completed = []

    for (const r of records) {
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

    return new Response(
      JSON.stringify({ active, overdue, completed }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || "Failed to fetch tasks" }), { status: 500 })
  }
}
