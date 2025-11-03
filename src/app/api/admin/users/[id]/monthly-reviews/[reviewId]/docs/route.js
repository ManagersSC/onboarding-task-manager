import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import logger from "@/lib/utils/logger"
import { logAuditEvent } from "@/lib/auditLogger"

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

async function uploadFileToAirtable(recordId, fieldName, file) {
  const arrayBuffer = await file.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString("base64")
  const body = {
    contentType: file.type || "application/octet-stream",
    filename: file.name,
    file: base64,
  }
  const url = `https://content.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${recordId}/${encodeURIComponent(fieldName)}/uploadAttachment`
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
    const { id, reviewId } = await params
    if (!id || !reviewId) return new Response(JSON.stringify({ error: "Applicant ID and reviewId required" }), { status: 400 })

    const cookieStore = await cookies()
    const sealedSession = cookieStore.get("session")?.value
    if (!sealedSession) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 })
    const session = await unsealData(sealedSession, { password: process.env.SESSION_SECRET })
    if (!session || session.userRole !== "admin") return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })

    const formData = await request.formData()
    const title = String(formData.get("title") || "").trim()
    const files = formData.getAll("files")
    if (files.length === 0) return new Response(JSON.stringify({ error: "No files provided" }), { status: 400 })

    // Validate review belongs to applicant
    const review = await base("Monthly Reviews").find(reviewId)
    const applicantLinks = review.get("Applicant") || []
    if (!applicantLinks.includes(id)) return new Response(JSON.stringify({ error: "Review does not belong to applicant" }), { status: 400 })

    // Only one file allowed per current UX, but handle multiple safely
    const toUpload = [files[0]]
    const uploaded = []
    for (const file of toUpload) {
      const buffer = await file.arrayBuffer()
      const safeTitle = title ? title.replace(/[\\/:*?"<>|]/g, "-").trim() : ""
      const newName = safeTitle || file.name
      const newFile = new File([buffer], newName, { type: file.type })
      await uploadFileToAirtable(reviewId, "Docs", newFile)
      uploaded.push({ name: newFile.name, size: newFile.size, type: newFile.type })
    }

    try {
      await logAuditEvent({
        eventType: "Monthly Review Document Upload",
        eventStatus: "Success",
        userName: session.userName,
        userRole: session.userRole,
        userIdentifier: session.userEmail,
        detailedMessage: `Uploaded ${uploaded.length} file(s) to Monthly Reviews (reviewId: ${reviewId}) for applicant ${id}`,
      })
    } catch (e) {
      logger?.error?.("audit log failed for review doc upload", e)
    }

    return new Response(JSON.stringify({ success: true, uploaded, reviewId, applicantId: id }), { status: 200, headers: { "Content-Type": "application/json" } })
  } catch (error) {
    logger?.error?.("monthly review docs upload failed", error)
    return new Response(JSON.stringify({ error: "Failed to upload document", details: process.env.NODE_ENV === "development" ? error.message : undefined }), { status: 500 })
  }
}
