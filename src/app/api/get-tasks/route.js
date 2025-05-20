import Airtable from "airtable"
import { cookies } from "next/headers"
import logger from "@/lib/utils/logger"
import { logAuditEvent } from "@/lib/auditLogger";
import { unsealData } from "iron-session";

// Get tasks
export async function GET(request) {
  let userEmail;
  let userRole;
  let userName;

  try {
    const sessionCookie = (await cookies()).get('session')?.value;
    if (!sessionCookie) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Session Validation Error Handling
    let session;
    try{
      session = await unsealData(sessionCookie, {
        password: process.env.SESSION_SECRET,
        ttl: 60 * 60 * 8 
      });
    } catch (error){
      return Response.json(
        { error: "Invalid session. Pleas log in again." },
        { status: 401 }
      )
    }

    if(!session.userEmail){
      return Response.json(
        { error: "Invalid session: no user email" },
        { status: 401 }
      );
    }

    // Extract session data
    userEmail = session.userEmail;
    userRole = session.userRole;
    userName = session.userName;

    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      logger.error("Server configuration error: Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID");
      return Response.json({ 
        error: "Server configuration error", 
        userError: "Apologies, we are experiencing a internal error. Please try again later.", 
      }, { status: 500 });
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

    const applicantRecords = await base("Applicants")
    .select({
      filterByFormula: `{fldjmvdigpKYyZS63} = '${userEmail}'`,
      fields: ["fldjmvdigpKYyZS63", "fldAQU0XOrRuerhPm", "fldnPHh5Ig2913oXe"],
    })
    .firstPage()

    logger.debug(`Applicant records: ${JSON.stringify(applicantRecords)}`);

    if (!applicantRecords || applicantRecords.length === 0) {
      logger.info("No applicant record found.")
      return Response.json({ error: "Applicant not found" }, { status: 404 })
    }

    const applicant = applicantRecords[0]
    const applicantEmail = applicant._rawJson.fields.Email;
    const applicantId = applicant._rawJson.id;
    
    const taskIds = applicant.get("Task Log") || [] 
    logger.info(`Tasks in task log: ${taskIds.length}`)

    if (taskIds.length === 0) {
      return Response.json({
        email: applicantEmail,
        recordId: applicantId,
        tasks: []
      })
    }

    const taskLogRecords = await base("Onboarding Tasks Logs")
    .select({
      filterByFormula: `FIND("${applicantRecords[0]._rawJson.fields.Email}", ARRAYJOIN({fldqftlVTfZ5sSkrs}))`,
      fields: [
        "Task", 
        "Status", 
        "Display Title", 
        "Display Desc", 
        "Display Resource Link", 
        "Last Status Change Time",
        "Created Date",
        "Task Week Number",
        "Folder Name",
        "isCustom",
        "Urgency"
      ],
      sort: [
        { field: "Created Date", direction: "desc" },
      ]
    })
    .all()

    if (taskLogRecords.length === 0) {
      logger.warn(`No task logs found for applicant: ${applicantId}`);
      return Response.json({
        email: applicantEmail,
        recordId: applicantId,
        tasks: []
      });
    }

    // Map each task log record to an object with proper status flags.
    const tasks = taskLogRecords.map((record) => {
      const logId= record.id;
      const status = record.get("Status");
      const isCustom = record.get("isCustom");
      const urgency = record.get("Urgency");

      const rawWeek = record.get("Task Week Number");
      let weekValue = null;
      if(Array.isArray(rawWeek) && rawWeek.length > 0){
        weekValue = rawWeek[0];
      }else if (typeof rawWeek === "string"){
        weekValue = rawWeek;
      }
      
      return {
        id: logId,
        title: record.get("Display Title") || "Untitled Task",
        description: record.get("Display Desc") || "",
        status: status,
        completed: status === "Completed",
        overdue: status === "Overdue",
        resourceUrl: record.get("Display Resource Link") || null,
        isCustom,
        urgency,
        lastStatusChange: record.get("Last Status Change Time") || null,
        week: weekValue,
        folder: record.get("Folder Name") || null
      };
    });

    const responsePayload = {
      email: applicantEmail,
      applicantId: applicantId,
      tasks,
    };

    logger.info(responsePayload);

    return Response.json(tasks)
  } catch (error) {
    logger.error('Full Error:', {
      message: error.message,
      stack: error.stack
    })
    logAuditEvent({
      eventType: "User",
      eventStatus: "Error",
      userRole: userRole || "Unknown",
      userName: userName || "Unknown",
      userIdentifier: userEmail,
      detailedMessage: `Fetching user detail failed, error message: ${error.message}`,
      request
    });
    return Response.json({ 
      error: "Internal server error",
      details: process.env.NODE_ENV === 'development' ? error.message : null
    }, { status: 500 })
  }
}

