import { cookies } from "next/headers"
import logger from "@/lib/utils/logger"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import { logAuditEvent } from "@/lib/auditLogger"
import { createNotification } from "@/lib/notifications"

// Core Tasks Route
export async function GET(request) {
  let userEmail, userRole, userName

  try {
    // 1. Session Cookie and Validation (unchanged)
    const sessionCookie = (await cookies()).get("session")?.value
    if (!sessionCookie) {
      logger.debug("API GET CORE-TASKS: No session cookie")
      return Response.json({ error: "Unauthorised" }, { status: 401 })
    }
    let session
    try {
      session = await unsealData(sessionCookie, {
        password: process.env.SESSION_SECRET,
        ttl: 60 * 60 * 8,
      })
    } catch (err) {
      logger.debug(`Invalid session: ${err.message}`)
      return Response.json(
        { error: "Invalid Session", details: process.env.NODE_ENV === "development" ? err.message : null },
        { status: 401 }
      )
    }
    if (!session.userEmail) {
      logger.debug("Invalid session format")
      return Response.json({ error: "Invalid session format" }, { status: 401 })
    }
    userRole = session.userRole
    if (userRole !== "admin") {
      return Response.json({ error: "Unauthorised" }, { status: 401 })
    }
    userEmail = session.userEmail
    userName = session.userName

  // 2. Parse Query Parameters (extended)
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const jobRole = searchParams.get("jobRole") || ""
  const jobTitle = searchParams.get("jobTitle") || "" // New: filter by Job Title (not record id)
  const folderNameFilter = searchParams.get("folderName") || "" // New: filter by Folder Name
    const sortBy = searchParams.get("sortBy") || "Task"
    const sortDirection = searchParams.get("sortDirection") === "desc" ? "desc" : "asc"
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10)
    const clientCursor = searchParams.get("cursor")
  const debugMode = (searchParams.get("debug") || "").toLowerCase() === "true"

  const debugInfo = {
    params: { search, jobRole, jobTitle, folderNameFilter, sortBy, sortDirection, pageSize, clientCursor },
    resolved: { jobIds: [], folderIds: [] },
    formula: "",
    restUrl: "",
  }

    // Treat "all" as no-filter
    const rawWeek = searchParams.get("week") || ""
    const rawDay = searchParams.get("day") || ""
    const week = rawWeek &&  rawWeek !== "all" ? rawWeek : ""
    const day = rawDay &&  rawDay !== "all" ? rawDay : ""

    // 3. Airtable credentials check (unchanged)
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      logger.error("Server configuration error: Missing Airtable credentials")
      return Response.json({ error: "Server configuration error" }, { status: 500 })
    }

  // Initialize Airtable base (used for resolving Job/Folder titles to record IDs and later lookups)
  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
    .base(process.env.AIRTABLE_BASE_ID)

  // 4. Build filter conditions (assemble formula later after enriching with Job/Folder filters)
  const escapeForAirtableString = (value) => (value || "").replace(/'/g, "''")
  const conditions = [
      "NOT({Week Number} = '0')",
      "NOT({Day Number} = '0')",
      "NOT({Type} = 'Managers')"
    ]
    const safeSearch = escapeForAirtableString(search).replace(/\n/g, ' ')
    if (search) {
      conditions.push(`OR(
          FIND(LOWER("${safeSearch}"), LOWER({Task})) > 0,
          FIND(LOWER("${safeSearch}"), LOWER({Folder Name})) > 0
        )`
      )
    }
    if (week)    conditions.push(`{Week Number} = '${week}'`)
    if (day)     conditions.push(`{Day Number} = '${day}'`)
    if (jobRole) conditions.push(`FIND('${jobRole}', ARRAYJOIN({Job})) > 0`)

  // Match Job by primary field value (Title) present in the linked field {Job}
  if (jobTitle) {
    try {
      const safeJobTitle = escapeForAirtableString(jobTitle)
      // Attempt resolution (for debug visibility only)
      try {
        const jobRecords = await base('Jobs')
          .select({
            fields: ['Title'],
            filterByFormula: `LOWER(TRIM({Title})) = LOWER(TRIM('${safeJobTitle}'))`
          })
          .all()
        debugInfo.resolved.jobIds = jobRecords.map(j => j.id)
      } catch {}
      // Compare against primary values exposed by ARRAYJOIN of the linked field
      conditions.push(`FIND(LOWER(TRIM('${safeJobTitle}')), LOWER(ARRAYJOIN({Job}))) > 0`)
    } catch (e) {
      logger.error('Error building job title filter:', e)
      conditions.push('FALSE()')
    }
  }

  // Match Folder by primary field value (Name) present in the linked field {Folder Name}
  if (folderNameFilter) {
    try {
      const safeFolderName = escapeForAirtableString(folderNameFilter)
      // Attempt resolution (for debug visibility only)
      try {
        const folderRecords = await base('Onboarding Folders')
          .select({
            fields: ['Name'],
            filterByFormula: `LOWER(TRIM({Name})) = LOWER(TRIM('${safeFolderName}'))`
          })
          .all()
        debugInfo.resolved.folderIds = folderRecords.map(f => f.id)
      } catch {}
      // Compare against primary values exposed by ARRAYJOIN of the linked field
      conditions.push(`FIND(LOWER(TRIM('${safeFolderName}')), LOWER(ARRAYJOIN({Folder Name}))) > 0`)
    } catch (e) {
      logger.error('Error building folder name filter:', e)
      conditions.push('FALSE()')
    }
  }

  const filterByFormula = `AND(${conditions.join(",")})`
  debugInfo.formula = filterByFormula

    // 5. Sort field mapping (unchanged)
    const sortFieldMap = { createdTime: 'Created Time' }
    const sortField = sortFieldMap[sortBy] || sortBy

    // 6. Fetch via REST API for reliable pagination (changed)
    const apiUrl = new URL(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Onboarding%20Tasks`
    )
    const params = apiUrl.searchParams
    params.set('pageSize', pageSize)
    if (clientCursor) params.set('offset', clientCursor)
    if (filterByFormula) params.set('filterByFormula', filterByFormula)
    params.set('sort[0][field]', sortField)
    params.set('sort[0][direction]', sortDirection)
  debugInfo.restUrl = apiUrl.toString()

    logger.debug(`Filter Formula: ${filterByFormula}`)
  logger.debug(`Resolved Job IDs: ${JSON.stringify(debugInfo.resolved.jobIds)}`)
  logger.debug(`Resolved Folder IDs: ${JSON.stringify(debugInfo.resolved.folderIds)}`)
    // logger.debug(`Airtable REST URL: ${apiUrl.toString()}`)

    const airtableRes = await fetch(apiUrl.toString(), {
      headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` },
    })
    if (!airtableRes.ok) {
      throw new Error(`Airtable REST error: ${airtableRes.statusText}`)
    }

    const { records: rawRecords, offset } = await airtableRes.json()
    const records = rawRecords || []
    const nextCursor = offset || null

  // 7. Use Airtable base for folder fetching (already initialized above)

    // 8. Get folder names for linked records
    const folderIds = new Set()
    records.forEach(rec => {
      const folderField = rec.fields['Folder Name']
      if (folderField && Array.isArray(folderField)) {
        folderField.forEach(id => folderIds.add(id))
      }
    })

    // Fetch folder details
    const folderMap = new Map()
    if (folderIds.size > 0) {
      try {
        const folderRecords = await base('Onboarding Folders')
          .select({
            filterByFormula: `OR(${Array.from(folderIds).map(id => `RECORD_ID() = '${id}'`).join(',')})`
          })
          .all()
        
        folderRecords.forEach(folder => {
          folderMap.set(folder.id, {
            name: folder.get('Name') || '',
            is_system: folder.get('is_system') || false,
            usage_count: folder.get('usage_count') || 0
          })
        })
      } catch (error) {
        logger.error('Error fetching folder details:', error)
      }
    }

    // 9. Get job names for linked records
    const jobIds = new Set()
    records.forEach(rec => {
      const jobField = rec.fields['Job']
      if (jobField && Array.isArray(jobField)) {
        jobField.forEach(id => jobIds.add(id))
      }
    })

    // Fetch job details
    const jobMap = new Map()
    if (jobIds.size > 0) {
      try {
        const jobRecords = await base('Jobs')
          .select({
            filterByFormula: `OR(${Array.from(jobIds).map(id => `RECORD_ID() = '${id}'`).join(',')})`
          })
          .all()
        
        jobRecords.forEach(job => {
          jobMap.set(job.id, {
            title: job.get('Title') || '',
            description: job.get('Description') || '',
            jobStatus: job.get('Job Status') || '',
            requiredExperience: job.get('Required Experience') || ''
          })
        })
      } catch (error) {
        logger.error('Error fetching job details:', error)
      }
    }

    // 10. Format tasks for frontend
    const tasks = records.map(rec => {
      const rawAttachments = rec.fields['File(s)'] || [];
      const folderField = rec.fields['Folder Name']
      let folderName = ''
      let folderInfo = null
      
      if (folderField && Array.isArray(folderField) && folderField.length > 0) {
        const folderId = folderField[0] // Take the first folder if multiple
        folderInfo = folderMap.get(folderId)
        folderName = folderInfo?.name || ''
      }

      const jobField = rec.fields['Job']
      let jobTitle = ''
      let jobInfo = null
      
      if (jobField && Array.isArray(jobField) && jobField.length > 0) {
        const jobId = jobField[0] // Take the first job if multiple
        jobInfo = jobMap.get(jobId)
        jobTitle = jobInfo?.title || ''
      }
      
      return {
        id: rec.id,
        title:        rec.fields['Task'] || 'Untitled Task',
        description:  rec.fields['Task Body'] || '',
        week:         rec.fields['Week Number'] || '',
        day:          rec.fields['Day Number'] || '',
        folderName:   folderName,
        folderInfo:   folderInfo,
        jobTitle:     jobTitle,
        jobInfo:      jobInfo,
        type:         rec.fields['Type'] || '',
        taskFunction: rec.fields['Task Function'] || '',
        job:          rec.fields['Job'] || '',
        location:     rec.fields['Location'] || '',
        resourceUrl:  rec.fields['Link'] || '',
        createdTime:  rec.fields['Created Time'] || '',
        attachments:  rec.fields['File(s)'] || [],
        attachmentCount: rawAttachments.length,
      }
    })

    // 11. Return JSON with pagination info
    return Response.json(Object.assign(
      {
        tasks,
        pagination: {
          pageSize,
          hasNextPage: Boolean(nextCursor),
          nextCursor,
        }
      },
      debugMode ? { debug: debugInfo } : {}
    ))

  } catch (error) {
    // Error handling (unchanged)
    logger.error('Error in core-tasks GET:', error)
    logAuditEvent({
      eventType: 'Task Page Query',
      eventStatus: 'Error',
      userRole: userRole || 'Unknown',
      userName: userName || 'Unknown',
      userIdentifier: userEmail,
      detailedMessage: `Error fetching core tasks: ${error.message}`,
      request,
    })
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request) {
  let userEmail, userRole, userName

  try {
    // DELETE handler unchanged, using SDK for deletion
    const sessionCookie = (await cookies()).get("session")?.value
    if (!sessionCookie) {
      logger.debug("API DELETE CORE-TASKS: No session cookie")
      return Response.json({ error: "Unauthorised" }, { status: 401 })
    }
    let session
    try {
      session = await unsealData(sessionCookie, {
        password: process.env.SESSION_SECRET,
        ttl: 60 * 60 * 8,
      })
    } catch (err) {
      logger.debug(`Invalid session: ${err.message}`)
      return Response.json(
        { error: "Invalid Session", details: process.env.NODE_ENV === "development" ? err.message : null },
        { status: 401 }
      )
    }
    if (!session.userEmail) {
      logger.debug("Invalid session format")
      return Response.json({ error: "Invalid session format" }, { status: 401 })
    }
    userRole = session.userRole
    if (userRole !== "admin") {
      return Response.json({ error: "Unauthorised" }, { status: 401 })
    }
    userEmail = session.userEmail
    userName = session.userName

    const { taskIds } = await request.json()
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return Response.json({ error: "Invalid request: taskIds is required" }, { status: 400 })
    }

    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      logger.error("Server configuration error: Missing Airtable credentials")
      return Response.json({ error: "Server configuration error" }, { status: 500 })
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
      .base(process.env.AIRTABLE_BASE_ID)

    const deletedIds = []
    const failedIds = []
    for (const id of taskIds) {
      try {
        await base('Onboarding Tasks').destroy(id)
        deletedIds.push(id)

        // Send notification to affected user (replace 'AFFECTED_USER_ID' with actual logic)
        await createNotification({
          title: "Task Deleted",
          body: `A task you were assigned (ID: ${id}) has been deleted.`,
          type: "Task",
          severity: "Warning",
          recipientId: 'AFFECTED_USER_ID', // TODO: Replace with actual affected user record id
          source: "System"
        });
      } catch (err) {
        logger.error(`Error deleting task ${id}:`, err)
        failedIds.push(id)
      }
    }

    logAuditEvent({
      eventType: "Task Deletion",
      eventStatus: failedIds.length === 0 ? "Success" : "Partial Success",
      userRole,
      userName,
      userIdentifier: userEmail,
      detailedMessage: `Deleted ${deletedIds.length} tasks${failedIds.length ? `, ${failedIds.length} failed` : ""}`,
      request,
    })

    return Response.json({
      success: true,
      message: `${deletedIds.length} tasks deleted successfully${failedIds.length ? `, ${failedIds.length} failed` : ""}`,
      deletedIds,
      failedIds,
    })

  } catch (error) {
    logger.error("Error in core-tasks DELETE:", error)
    logAuditEvent({
      eventType: "Task Deletion",
      eventStatus: "Error",
      userRole: userRole || "Unknown",
      userName: userName || "Unknown",
      userIdentifier: userEmail,
      detailedMessage: `Error deleting core tasks: ${error.message}`,
      request,
    })
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
