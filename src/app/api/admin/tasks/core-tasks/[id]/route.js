import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import logger from "@/lib/utils/logger"
import { logAuditEvent } from "@/lib/auditLogger"
import { createNotification } from "@/lib/notifications"

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
    
    // Resolve folder name from linked record
    let folderName = ''
    let folderInfo = null
    const folderField = record.fields['Folder Name']
    if (folderField && Array.isArray(folderField) && folderField.length > 0) {
      try {
        const folderRecord = await base('Onboarding Folders').find(folderField[0])
        folderName = folderRecord.get('Name') || ''
        folderInfo = {
          name: folderName,
          is_system: folderRecord.get('is_system') || false,
          usage_count: folderRecord.get('usage_count') || 0
        }
      } catch (error) {
        logger.error('Error fetching folder details:', error)
      }
    }

    // Resolve job name from linked record
    let jobTitle = ''
    let jobInfo = null
    const jobField = record.fields['Job']
    if (jobField && Array.isArray(jobField) && jobField.length > 0) {
      try {
        const jobRecord = await base('Jobs').find(jobField[0])
        jobTitle = jobRecord.get('Title') || ''
        jobInfo = {
          title: jobTitle,
          description: jobRecord.get('Description') || '',
          jobStatus: jobRecord.get('Job Status') || '',
          requiredExperience: jobRecord.get('Required Experience') || ''
        }
      } catch (error) {
        logger.error('Error fetching job details:', error)
      }
    }
    
    const task = {
      id: record.id,
      title: record.fields['Task'] || '',
      description: record.fields['Task Body'] || '',
      type: record.fields['Type'] || '',
      week: record.fields['Week Number']?.toString() || '',
      day: record.fields['Day Number']?.toString() || '',
      folderName: folderName,
      folderInfo: folderInfo,
      jobTitle: jobTitle,
      jobInfo: jobInfo,
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

      // Week and Day are single-select fields in Airtable with string values "1"–"5"
      // Skip entirely when empty (no "None" option in UI), send raw string when set.
      if (formKey === "week" || formKey === "day") {
        if (raw === "") continue // no value selected — leave Airtable field untouched
        fieldsToUpdate[airtableKey] = raw // e.g. "3" — must be a string for single-select
        continue
      }

      // Folder Name is a linked record field — look up the record ID by Name.
      // Airtable requires [] (not null) to clear a linked record field.
      if (formKey === "folderName") {
        if (raw === "") {
          fieldsToUpdate["Folder Name"] = [] // clear the linked record
        } else {
          try {
            const escaped = raw.replace(/"/g, '\\"')
            const folders = await base("Onboarding Folders")
              .select({ filterByFormula: `{Name} = "${escaped}"`, maxRecords: 1 })
              .firstPage()
            if (folders.length > 0) {
              fieldsToUpdate["Folder Name"] = [folders[0].id]
            }
            // If no match found, skip — don't wipe with empty array
          } catch (e) {
            logger.error("Error looking up folder record:", e)
          }
        }
        continue
      }

      // Job is a linked record field — look up the record ID by Title.
      if (formKey === "job") {
        if (raw === "") {
          fieldsToUpdate["Job"] = [] // clear the linked record
        } else {
          try {
            const escaped = raw.replace(/"/g, '\\"')
            const jobs = await base("Jobs")
              .select({ filterByFormula: `{Title} = "${escaped}"`, maxRecords: 1 })
              .firstPage()
            if (jobs.length > 0) {
              fieldsToUpdate["Job"] = [jobs[0].id]
            }
            // If no match found, skip — don't wipe with empty array
          } catch (e) {
            logger.error("Error looking up job record:", e)
          }
        }
        continue
      }

      // Text / single-select fields — null clears the field, string sets it
      if (raw === "") {
        fieldsToUpdate[airtableKey] = null
        continue
      }
      fieldsToUpdate[airtableKey] = raw
    }

    // 5. Update record in Airtable
    if (Object.keys(fieldsToUpdate).length) {
      await base("Onboarding Tasks").update([{ id: recordId, fields: fieldsToUpdate }])
    }

    // 6. Notify all applicants who have this task assigned
    try {
      const taskTitle = formData.get("title") || "a task"
      const logs = await base("Onboarding Tasks Logs")
        .select({
          filterByFormula: `FIND("${recordId}", ARRAYJOIN({Task}))`,
          fields: ["Assigned"],
        })
        .all()

      for (const log of logs) {
        const assignedIds = log.fields["Assigned"] || []
        for (const assignedId of assignedIds) {
          await createNotification({
            title: "Task Updated",
            body: `A task you were assigned ("${taskTitle}") has been updated.`,
            type: "Task",
            severity: "Info",
            recipientId: assignedId,
            source: "System",
          })
        }
      }
    } catch (notifErr) {
      // Notification failure must not break the save
      logger.error("Error sending task update notifications:", notifErr)
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
