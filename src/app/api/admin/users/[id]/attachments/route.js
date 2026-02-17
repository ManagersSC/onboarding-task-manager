import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import logger from "@/lib/utils/logger"
import { logAuditEvent } from "@/lib/auditLogger"

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

async function uploadFileToAirtable(recordId, fieldId, file) {
  const arrayBuffer = await file.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString("base64")
  const body = {
    contentType: file.type || "application/octet-stream",
    filename: file.name,
    file: base64,
  }
  const url = `https://content.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${recordId}/${encodeURIComponent(fieldId)}/uploadAttachment`
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Upload failed (${resp.status}): ${text}`)
  }
  return resp.json()
}

export async function POST(request, { params }) {
  try {
    const { id } = await params

    // Auth
    const cookieStore = await cookies()
    const sealedSession = cookieStore.get("session")?.value
    if (!sealedSession) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 })
    const session = await unsealData(sealedSession, { password: process.env.SESSION_SECRET })
    if (!session || session.userRole !== "admin") return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })

    const formData = await request.formData()
    const fieldId = String(formData.get("fieldId") || "").trim()
    const title = String(formData.get("title") || "").trim()
    let files = formData.getAll("files")
    if (!fieldId || files.length === 0) {
      return new Response(JSON.stringify({ error: "Missing fieldId or files" }), { status: 400 })
    }

    // Validate applicant exists
    const recs = await base("Applicants").select({ filterByFormula: `RECORD_ID() = '${id}'`, fields: ["Name"], maxRecords: 1 }).firstPage()
    if (!recs || recs.length === 0) return new Response(JSON.stringify({ error: "Applicant not found" }), { status: 404 })

    const uploaded = []
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer()
      // If a title is provided, replace the original filename entirely
      const safeTitle = title ? title.replace(/[\\/:*?"<>|]/g, "-").trim() : ""
      const newName = safeTitle || file.name
      const newFile = new File([arrayBuffer], newName, { type: file.type })
      await uploadFileToAirtable(id, fieldId, newFile)
      uploaded.push({ name: newFile.name, size: newFile.size, type: newFile.type })
    }

    try {
      await logAuditEvent({
        eventType: "Monthly Review Document Upload",
        eventStatus: "Success",
        userName: session.userName,
        userRole: session.userRole,
        userIdentifier: session.userEmail,
        detailedMessage: `Uploaded ${uploaded.length} file(s) to ${fieldId} for applicant ${id}`,
      })
    } catch (e) {
      logger?.error?.("audit log failed for attachments", e)
    }

    return new Response(
      JSON.stringify({ success: true, fieldId, uploaded, applicantId: id, uploadedAt: new Date().toISOString() }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )
  } catch (error) {
    logger?.error?.("generic attachments upload failed", error)
    return new Response(
      JSON.stringify({ error: "Failed to upload attachments", details: process.env.NODE_ENV === "development" ? error.message : undefined }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }
}


