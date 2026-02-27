import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import logger from "@/lib/utils/logger"
import { logAuditEvent } from "@/lib/auditLogger"

export async function GET(request, { params }) {
  const { id } = await params
  // Auth
  const sessionCookie = (await cookies()).get("session")?.value
  if (!sessionCookie) return new Response(null, { status: 401 })
  let session
  try {
    session = await unsealData(sessionCookie, {
      password: process.env.SESSION_SECRET,
      ttl: 60 * 60 * 8,
    })
  } catch (err) {
    return Response.json({ error: "Invalid Session" }, { status: 401 })
  }
  if (session.userRole !== "admin") return new Response(null, { status: 403 })
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    logger.error("Missing Airtable credentials")
    return new Response(null, { status: 500 })
  }
  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)
  try {
    const record = await base("Onboarding Tasks Logs").find(id)
    // multipleLookupValues fields return arrays — extract first element.
    const firstVal = (v) => (Array.isArray(v) ? v[0] : v) || ''
    // Created Date is a createdTime (ISO-8601). Slice to YYYY-MM-DD for <input type="date">.
    const rawDate = record.fields['Created Date'] || ''
    const log = {
      id: record.id,
      name: firstVal(record.fields['Applicant Name']),
      email: firstVal(record.fields['Applicant Email']),
      title: record.fields['Display Title'] || '',
      description: record.fields['Display Desc'] || '',
      folder: firstVal(record.fields['Folder Name']),
      resource: record.fields['Display Resource Link'] || '',
      assignedDate: rawDate ? rawDate.slice(0, 10) : '',
      attachments: record.fields['File(s)'] || [],
    }
    return Response.json({ log })
  } catch (error) {
    logger.error('Error fetching log record', error)
    return new Response(null, { status: 404 })
  }
}

export async function PATCH(request, { params }) {
  const { id } = await params
  // Auth
  const sessionCookie = (await cookies()).get("session")?.value
  if (!sessionCookie) return new Response(null, { status: 401 })
  let session
  try {
    session = await unsealData(sessionCookie, {
      password: process.env.SESSION_SECRET,
      ttl: 60 * 60 * 8,
    })
  } catch (err) {
    return new Response(null, { status: 401 })
  }
  if (session.userRole !== "admin") return new Response(null, { status: 403 })
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    logger.error("Missing Airtable credentials")
    return new Response(null, { status: 500 })
  }
  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)
  try {
    const formData = await request.formData()
    const FIELD_MAP = {
      name: 'Applicant Name',
      email: 'Applicant Email',
      title: 'Display Title',
      description: 'Display Desc',
      folder: 'Folder Name',
      resource: 'Display Resource Link',
    }
    const fieldsToUpdate = {}
    for (const [formKey, airtableKey] of Object.entries(FIELD_MAP)) {
      if (!formData.has(formKey)) continue
      let raw = formData.get(formKey)
      if (raw === "") {
        fieldsToUpdate[airtableKey] = null
        continue
      }
      fieldsToUpdate[airtableKey] = raw
    }
    // Update record fields
    if (Object.keys(fieldsToUpdate).length) {
      await base("Onboarding Tasks Logs").update([{ id, fields: fieldsToUpdate }])
    }
    // Handle file uploads (append to File(s))
    const files = formData.getAll("files")
    if (files.length > 0) {
      // Use the same upload logic as core-tasks
      for (const file of files) {
        await uploadFileViaJson(id, "File(s)", file)
      }
    }
    return new Response(null, { status: 204 })
  } catch (err) {
    logger.error('PATCH error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params
  const sessionCookie = (await cookies()).get("session")?.value
  if (!sessionCookie) return new Response(null, { status: 401 })
  let session
  try {
    session = await unsealData(sessionCookie, {
      password: process.env.SESSION_SECRET,
      ttl: 60 * 60 * 8,
    })
  } catch (err) {
    return Response.json({ error: "Invalid Session" }, { status: 401 })
  }
  if (session.userRole !== "admin") return new Response(null, { status: 403 })
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    logger.error("Missing Airtable credentials")
    return new Response(null, { status: 500 })
  }
  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)
  try {
    await base("Onboarding Tasks Logs").destroy(id)
    logAuditEvent({
      eventType: "Assigned Task Deletion",
      eventStatus: "Success",
      userRole: session.userRole,
      userName: session.userName,
      userIdentifier: session.userEmail,
      detailedMessage: `Deleted assigned task log: ${id}`,
      request,
    })
    return new Response(null, { status: 204 })
  } catch (error) {
    logger.error("Error deleting assigned task log", error)
    return Response.json({ error: "Failed to delete record" }, { status: 500 })
  }
}

// Helper for file upload (copy from core-tasks)
async function uploadFileViaJson(recordId, fieldName, file) {
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