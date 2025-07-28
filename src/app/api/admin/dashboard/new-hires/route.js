import { cookies } from "next/headers"
import logger from "@/lib/utils/logger"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import { logAuditEvent } from "@/lib/auditLogger"

export async function GET(request) {
  let userEmail, userRole, userName

  try {
    // 1. Session validation and admin check
    const sessionCookie = (await cookies()).get("session")?.value
    if (!sessionCookie) {
      logger.debug("API GET NEW-HIRES: No session cookie")
      return Response.json({ error: "Unauthorised" }, { status: 401 })
    }

    let session
    try {
      session = await unsealData(sessionCookie, {
        password: process.env.SESSION_SECRET,
        ttl: 60 * 60 * 8,
      })
    } catch (error) {
      logger.debug(`Invalid session: ${error.message}`)
      return Response.json(
        { error: "Invalid Session", details: process.env.NODE_ENV === "development" ? error.message : null },
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

    // 2. Airtable setup
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      logger.error("Server configuration error: Missing Airtable credentials")
      return Response.json({ error: "Server configuration error" }, { status: 500 })
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

    // 3. Fetch applicants with Stage = "Hired" and active onboarding
    const filterFormula = `AND(
      {Stage} = 'Hired',
      NOT({Onboarding Status} = 'Week 4 Quiz ✅')
    )`

    const applicantRecords = await base("Applicants")
      .select({
        filterByFormula: filterFormula,
        fields: [
          "Name",
          "Email", 
          "Job Name",
          "Applying For",
          "Onboarding Start Date",
          "Onboarding Started",
          "Onboarding Initiation Flow",
          "Onboarding Status",
          "Onboarding Week",
          "Onboarding Week Day"
        ],
        sort: [{ field: "Onboarding Started", direction: "asc" }, { field: "Onboarding Start Date", direction: "desc" }]
      })
      .all()

    // 4. Calculate progress for each applicant
    const newHires = await Promise.all(
      applicantRecords.map(async (record) => {
        const fields = record.fields
        
        // Calculate progress from Onboarding Tasks Logs
        const taskLogs = await base("Onboarding Tasks Logs")
          .select({
            filterByFormula: `FIND("${fields["Email"]}", ARRAYJOIN({Assigned}))`,
            fields: ["Status", "Task"]
          })
          .all()
        
        const completed = taskLogs.filter(log => log.fields.Status === "Completed").length
        const total = taskLogs.length
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0

        // Get job details from lookup fields
        const jobName = Array.isArray(fields["Job Name"]) ? fields["Job Name"][0] : fields["Job Name"] || "Unknown"
        const applyingFor = Array.isArray(fields["Applying For"]) ? fields["Applying For"][0] : fields["Applying For"] || "Unknown"

        return {
          id: record.id,
          name: fields["Name"] || "Unknown",
          email: fields["Email"] || "",
          role: jobName,
          department: applyingFor,
          onboardingStartDate: fields["Onboarding Start Date"] || null,
          onboardingStarted: fields["Onboarding Started"] || false,
          onboardingInitiationFlow: fields["Onboarding Initiation Flow"] || false,
          onboardingStatus: fields["Onboarding Status"] || "Not Started",
          onboardingWeek: fields["Onboarding Week"] || 0,
          onboardingWeekDay: fields["Onboarding Week Day"] || 0,
          progress,
          tasks: {
            completed,
            total
          },
          avatar: "/file.svg" // Default avatar, can be enhanced later
        }
      })
    )

    return Response.json({ newHires })

  } catch (error) {
    logger.error("Error fetching new hires data:", error)
    
    await logAuditEvent({
      eventType: "New Hires Data Fetch",
      eventStatus: "Error",
      userRole: userRole || "Unknown",
      userName: userName || "Unknown",
      userIdentifier: userEmail || "Unknown",
      detailedMessage: `Error fetching new hires: ${error.message}`,
      request
    })

    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
} 