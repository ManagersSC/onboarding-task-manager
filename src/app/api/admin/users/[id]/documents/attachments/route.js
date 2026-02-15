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
    if (!id) return new Response(JSON.stringify({ error: "Applicant ID required" }), { status: 400 })

    // Auth
    const cookieStore = await cookies()
    const sealedSession = cookieStore.get("session")?.value
    if (!sealedSession) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 })
    const session = await unsealData(sealedSession, { password: process.env.SESSION_SECRET })
    if (!session || session.userRole !== "admin") return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })

    const formData = await request.formData()
    const fieldId = String(formData.get("fieldId") || "").trim()
    const title = String(formData.get("title") || "").trim()
    const files = formData.getAll("files")
    if (!fieldId || files.length === 0) {
      return new Response(JSON.stringify({ error: "Missing fieldId or files" }), { status: 400 })
    }

    // Validate applicant and find or create a Documents record linked to applicant
    const applicantRec = await base("Applicants").find(id).catch(() => null)
    if (!applicantRec) return new Response(JSON.stringify({ error: "Applicant not found" }), { status: 404 })

    let documentsRecordId = ""
    try {
      const linked = applicantRec.get("Documents") || []
      if (Array.isArray(linked) && linked.length > 0) {
        documentsRecordId = linked[0]
      } else {
        // Create a Documents record and link to applicant
        const created = await base("Documents").create([
          {
            fields: {
              Applicants: [id],
              Email: applicantRec.get("Email") || "",
            },
          },
        ])
        documentsRecordId = created?.[0]?.id || ""
      }
    } catch (e) {
      logger?.error?.("Failed to resolve Documents record", e)
      return new Response(JSON.stringify({ error: "Failed to prepare documents record" }), { status: 500 })
    }
    if (!documentsRecordId) {
      return new Response(JSON.stringify({ error: "Unable to prepare documents record" }), { status: 500 })
    }

    // Upload files to Documents table field
    const uploaded = []
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer()
      const safeTitle = title ? title.replace(/[\\/:*?"<>|]/g, "-").trim() : ""
      const newName = safeTitle || file.name
      const newFile = new File([arrayBuffer], newName, { type: file.type })
      await uploadFileToAirtable(documentsRecordId, fieldId, newFile)
      uploaded.push({ name: newFile.name, size: newFile.size, type: newFile.type })
    }

    // Audit
    try {
      await logAuditEvent({
        eventType: "Document Upload",
        eventStatus: "Success",
        userName: session.userName,
        userRole: session.userRole,
        userIdentifier: session.userEmail,
        detailedMessage: `Uploaded ${uploaded.length} file(s) to Documents.${fieldId} for applicant ${id} (documentsRecordId: ${documentsRecordId})`,
        request,
      })
    } catch (e) {
      logger?.error?.("audit log failed for Documents upload", e)
    }

    return new Response(JSON.stringify({ success: true, uploaded, documentsRecordId, applicantId: id }), { status: 200, headers: { "Content-Type": "application/json" } })
  } catch (error) {
    logger?.error?.("documents attachments upload failed", error)
    return new Response(JSON.stringify({ error: "Failed to upload document", details: process.env.NODE_ENV === "development" ? error.message : undefined }), { status: 500 })
  }
}


