import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import logger from "@/lib/utils/logger"

export async function GET(request, { params }) {
  const p = await params
  const { logId } = p

  // 1) Authenticate
  const sessionCookie = (await cookies()).get("session")?.value
  if (!sessionCookie) return Response.json({ error: "Unauthorized" }, { status: 401 })

  let session
  try {
    session = await unsealData(sessionCookie, {
      password: process.env.SESSION_SECRET,
      ttl: 60 * 60 * 8,
    })
  } catch {
    return Response.json({ error: "Invalid session" }, { status: 401 })
  }

  if (!session.userEmail) {
    return Response.json({ error: "Invalid session" }, { status: 401 })
  }

  // 2) Airtable init
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    logger.error("Missing Airtable credentials")
    return Response.json({ error: "Server configuration error" }, { status: 500 })
  }

  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
    process.env.AIRTABLE_BASE_ID
  )

  try {
    // 3) Fetch the task log record and verify ownership
    const logRecord = await base("Onboarding Tasks Logs").find(logId)

    // Verify this task log belongs to the current user via the Applicant Email lookup
    const applicantEmails = logRecord.fields["Applicant Email"] || []
    const userEmail = session.userEmail.toLowerCase()
    const isOwner = Array.isArray(applicantEmails)
      ? applicantEmails.some((e) => e.toLowerCase() === userEmail)
      : String(applicantEmails).toLowerCase() === userEmail

    if (!isOwner) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    // 4) Get the linked core task ID
    const linkedTaskIds = logRecord.fields["Task"] || []
    if (!Array.isArray(linkedTaskIds) || linkedTaskIds.length === 0) {
      return Response.json({ attachments: [], resourceUrl: null })
    }

    const coreTaskId = linkedTaskIds[0]

    // 5) Fetch the core task to get File(s) and Link
    const coreTask = await base("Onboarding Tasks").find(coreTaskId)
    const attachments = coreTask.fields["File(s)"] || []
    const resourceUrl = coreTask.fields["Link"] || null

    return Response.json({ attachments, resourceUrl })
  } catch (err) {
    logger.error("Error fetching user task files:", err)
    return Response.json({ error: "Failed to fetch files" }, { status: 500 })
  }
}
