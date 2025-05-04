import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import logger from "@/lib/utils/logger"
import { logAuditEvent } from "@/lib/auditLogger"

// For Task Edit Sheet 
export async function GET(request, { params }) {
  const p = await params
  const id = p.id

  // Session 
  const sessionCookie = (await cookies()).get("session")?.value
  if (!sessionCookie) return new Response(null, { status: 401 })
  let session
  try {
    session = await unsealData(sessionCookie, 
      { 
        password: process.env.SESSION_SECRET, 
        ttl: 60*60*8 
      }
    )
  } catch (err) {
    return Response.json(
        { error: "Invalid Session", details: process.env.NODE_ENV === "development" ? err.message : null },
        { status: 401 }
    )
  }
  if (session.userRole !== "admin") return new Response(null, { status: 403 })

  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    logger.error("Missing Airtable credentials")
    return new Response(null, { status: 500 })
  }

  // Init Airtable
  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)
  try {
    const record = await base('Onboarding Tasks').find(id)
    const task = {
      id: record.id,
      title: record.fields['Task'] || '',
      description: record.fields['Task Body'] || '',
      type: record.fields['Type'] || '',
      week: record.fields['Week Number']?.toString() || '',
      day: record.fields['Day Number']?.toString() || '',
      folderName: record.fields['Folder Name'] || '',
      job: record.fields['Job'] || '',
      location: record.fields['Location'] || '',
      resourceUrl: record.fields['Link'] || '',
      attachments: record.fields['File(s)']
        ? record.fields["File(s)"].map((file) => ({
          id: file.id,
          filename: file.filename,
          size: file.size,
          type: file.type,
          url: file.url,
        }))
      : [],
    }
    return new Response(JSON.stringify({ task }), { status: 200 })
  } catch (error) {
    logger.error('Error fetching record', error)
    logAuditEvent({ 
        eventType: 'Fetch Single Query', 
        eventStatus: 'Error', 
        userName: session.userName,
        userRole: session.userRole,
        userIdentifier: session.userEmail, 
        detailedMessage: error.message 
    })
    return new Response(null, { status: 500 })
  }
}

export async function PATCH(request, { params }) {
  const p = await params
  const { id: recordId } = p
  
  // Session 
  const sessionCookie = (await cookies()).get("session")?.value
  if (!sessionCookie) return new Response(null, { status: 401 })
  let session
  try {
    session = await unsealData(sessionCookie, {
      password: process.env.SESSION_SECRET,
      ttl: 60 * 60 * 8,
    })
  } catch {
    return new Response(null, { status: 401 })
  }
  if (session.userRole !== "admin") return new Response(null, { status: 403 })


  // Init Airtable
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    return new Response(null, { status: 500 })
  }
  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

  try {
    // 3. Parse multipart/form-data
    const formData = await request.formData()
    const FIELD_MAP = {
      title:       "Task",
      description: "Task Body",
      type:        "Type",
      week:        "Week Number",
      day:         "Day Number",
      folderName:  "Folder Name",
      job:         "Job",
      location:    "Location",
      resourceUrl: "Link",
    }

    // 4. Build fieldsToUpdate object
    const fieldsToUpdate = {}
    for (const [formKey, airtableKey] of Object.entries(FIELD_MAP)) {
      if (!formData.has(formKey)) continue

      let raw = formData.get(formKey)
      // If user cleared it, send null
      if(raw === ""){
        fieldsToUpdate[airtableKey] = null
        continue
      }

      fieldsToUpdate[airtableKey] = raw
    }

    // 5. Update record metadata & strip attachments if you support removal
    if (Object.keys(fieldsToUpdate).length) {
      await base("Onboarding Tasks").update([{ id: recordId, fields: fieldsToUpdate }])
    }

    // 6. Upload new files
    const files = formData.getAll("files")  // ensure your client uses formData.append("files", file)
    for (const file of files) {
      await uploadFileViaJson(recordId, "File(s)", file)
    }

    const title = formData.get("title")
    logAuditEvent({ 
      eventType: 'Task Update', 
      eventStatus: 'Success', 
      userName: session.userName,
      userRole: session.userRole,
      userIdentifier: session.userEmail, 
      detailedMessage: `${session.userName} updated ${title}`
    })

    return new Response(null, { status: 204 })
  } catch (err) {
    console.error("PATCH error:", err)
    logAuditEvent({ 
      eventType: 'Task Update', 
      eventStatus: 'Error', 
      userName: session.userName,
      userRole: session.userRole,
      userIdentifier: session.userEmail, 
      detailedMessage: `Failed to update task. Error Message: ${err.message} `
  })
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}


export async function uploadFileViaJson(recordId, fieldName, file) {
  // 1) Read raw bytes
  const arrayBuffer = await file.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString("base64")

  // 2) Build JSON body
  const body = {
    contentType: file.type || "application/octet-stream",
    filename:    file.name,
    file:        base64,
  }

  // 3) POST to Airtable
  const url = `https://content.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${recordId}/${encodeURIComponent(fieldName)}/uploadAttachment`

  const resp = await fetch(url, {
    method:  "POST",
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Upload failed (\${resp.status}): ${text}`)
  }

  return resp.json()
}
