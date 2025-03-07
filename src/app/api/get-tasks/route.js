import Airtable from "airtable"
import { cookies } from "next/headers"
import logger from "@/lib/logger"

export async function GET() {
  if (!process.env.AIRTABLE_API_KEY) {
    return Response.json({ error: "Missing AIRTABLE_API_KEY" }, { status: 500 })
  }
  if (!process.env.AIRTABLE_BASE_ID) {
    return Response.json({ error: "Missing AIRTABLE_BASE_ID" }, { status: 500 })
  }

  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

  try {
    const cookieStore = await cookies()
    const userEmail = cookieStore.get("user_email")?.value

    if (!userEmail) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

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
        "Task Title", 
        "Task Desc", 
        "Resource Link", 
        "Last Status Change Time",
        "Created",
        "Task Week Number"
      ],
      sort: [
        { field: "Created", direction: "desc" },
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
      const taskField = record.get("Task");
      const taskId = Array.isArray(taskField) && taskField.length > 0 ? taskField[0] : record.id;

      const rawWeek = record.get("Task Week Number");
      let weekValue = null;
      if(Array.isArray(rawWeek) && rawWeek.length > 0){
        weekValue = rawWeek[0];
      }else if (typeof rawWeek === "string"){
        weekValue = rawWeek;
      }

      logger.info(logId)
      return {
        id: logId,
        title: record.get("Task Title") || "Untitled Task",
        description: record.get("Task Desc") || "",
        completed: status === "Completed",
        overdue: status === "Overdue",
        // The front end uses the absence of completed and overdue flags to filter for 'assigned' tasks.
        resourceUrl: record.get("Resource Link") || null,
        lastStatusChange: record.get("Last Status Change Time") || null,
        week: weekValue
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
    return Response.json({ 
      error: "Internal server error",
      details: process.env.NODE_ENV === 'development' ? error.message : null
    }, { status: 500 })
  }
}

