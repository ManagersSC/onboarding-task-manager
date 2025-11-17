import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import logger from "@/lib/utils/logger"

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

// Reuse Airtable Content API for direct attachment upload
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
    const { id } = await params

    // Auth check
    const cookieStore = await cookies()
    const sealedSession = cookieStore.get("session")?.value
    if (!sealedSession) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 })
    }
    const session = await unsealData(sealedSession, { password: process.env.SESSION_SECRET })
    if (!session || session.userRole !== "admin") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    // Validate applicant exists (and get name for logs)
    const applicantRecords = await base("Applicants")
      .select({ filterByFormula: `RECORD_ID() = '${id}'`, fields: ["Name", "Email"], maxRecords: 1 })
      .firstPage()
    if (!applicantRecords || applicantRecords.length === 0) {
      return new Response(JSON.stringify({ error: "Applicant not found" }), { status: 404 })
    }
    const applicant = applicantRecords[0]
    const applicantName = applicant.get("Name") || "Unknown"

    // Parse form data
    const formData = await request.formData()
    const files = formData.getAll("files")
    if (!files || files.length === 0) {
      return new Response(JSON.stringify({ error: "No files provided" }), { status: 400 })
    }

    const fieldName = "Appraisal Doc"

    logger.info(
      `Uploading ${files.length} appraisal document(s) for applicant ${id} (${applicantName}) to field ${fieldName}`,
    )

    // Upload each file
    const uploaded = []
    for (const file of files) {
      await uploadFileToAirtable(id, fieldName, file)
      uploaded.push({ name: file.name, size: file.size, type: file.type })
    }

    return new Response(
      JSON.stringify({ success: true, uploaded, fieldName, applicantId: id, uploadedAt: new Date().toISOString() }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )
  } catch (error) {
    logger?.error?.("appraisal upload failed", error)
    return new Response(
      JSON.stringify({ error: "Failed to upload appraisal document", details: process.env.NODE_ENV === "development" ? error.message : undefined }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }
}


