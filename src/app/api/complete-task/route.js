import Airtable from "airtable";
import { cookies } from "next/headers";
import logger from "@/lib/utils/logger";
import { logAuditEvent } from "@/lib/auditLogger";
import { unsealData } from "iron-session";
import { createNotification } from "@/lib/notifications";

// Complete tasks
export async function POST(request) {
  let userEmail;
  let userName;
  let userRole;

  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    logger.error("ctServer configuration error: Missing API key or base ID");
    return Response.json({ error: "Server configuration error" }, { status: 500 });
  }

  const base = new Airtable({ 
    apiKey: process.env.AIRTABLE_API_KEY 
  }).base(process.env.AIRTABLE_BASE_ID);
  
  try {
    // Session Validation Error Handling
    const cookieStore = cookies();
    const sessionCookie = (await cookieStore).get("session")?.value;
    
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

    const { taskId } = await request.json();
    logger.info("ctReceived request with taskId:", taskId);
    if (!taskId) {
      logger.error("ctMissing taskId in request body");
      return Response.json({ 
        error: "Missing taskId",
        userError: "This task is missing a task ID" 
      }, { status: 400 });
    }

    logger.info("User email from cookies:", userEmail);
    if (!userEmail) {
      logger.error("ctUnauthorised access: No user_email found in cookies");
      return Response.json({ 
        error: "Unauthorised",
        userError: "You are unauthorised to access this." 
      }, { status: 401 });
    }

    // First, fetch applicant record and task log record.
    const applicantQuery = base("Applicants")
      .select({
        filterByFormula: `{Email}='${userEmail}'`,
        maxRecords: 1,
      })
      .firstPage();
    const taskLogPromise = base("Onboarding Tasks Logs").find(taskId);

    const [applicantRecords, taskLogRecord] = await Promise.all([
      applicantQuery,
      taskLogPromise,
    ]);

    if (!applicantRecords || applicantRecords.length === 0) {
      return Response.json({ error: "No applicant found for this email" }, { status: 404 });
    }

    const applicantRecord = applicantRecords[0];
    const isPaused = applicantRecord.fields["Onboarding Paused"] === true
    if (isPaused) {
      await logAuditEvent({
        eventType: "Task Completion Blocked",
        eventStatus: "Failure",
        userIdentifier: userEmail,
        userName,
        userRole,
        detailedMessage: `Blocked task completion for ${taskId} because onboarding is paused`,
        request,
      }).catch(() => {})
      return Response.json({
        error: "Onboarding is paused; task completion is disabled.",
        userError: "Your onboarding is paused. Please contact your manager.",
        paused: true,
        taskLogId: taskId,
      }, { status: 403 })
    }

    // 1. Update the Status field in the Onboarding Tasks Logs table now that guard passed.
    await base("Onboarding Tasks Logs").update([
      {
        id: taskId,
        fields: { Status: "Completed" },
      },
    ])

    // 3. Generate New Interface Message.
    const applicantId = applicantRecord.id;
    const applicantName = applicantRecord.fields["Name"] || "Unknown";
    // Fix: Handle taskTitle as array (extract first element if it's an array)
    const rawTaskTitle = taskLogRecord.fields["Task Title"] || "a task";
    const taskTitle = Array.isArray(rawTaskTitle) ? rawTaskTitle[0] : rawTaskTitle;
    const interfaceMessage = applicantRecord.fields["Interface Message - Onboarding Status Update"] || "";
    const currentDateTime = new Date().toLocaleString("en-GB");

    const newLine = `- ${applicantName} has completed ${taskTitle} with record ID: ${taskId} at ${currentDateTime}`;
    const updatedMessage = interfaceMessage ? `${interfaceMessage}\n${newLine}` : newLine;

    // 4. Create Tasks table record for completed task (NEW FUNCTIONALITY)
    let tasksRecordId = null;
    try {
      // Get the current date for completion tracking
      const now = new Date();
      const currentDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0]; // YYYY-MM-DD local

      // Compute due date = 2 working days after today (Mon-Fri)
      const addWorkingDays = (start, numDays) => {
        const d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        let added = 0;
        while (added < numDays) {
          d.setDate(d.getDate() + 1);
          const day = d.getDay(); // 0 Sun, 6 Sat
          if (day !== 0 && day !== 6) added += 1;
        }
        return d;
      };
      const due = addWorkingDays(now, 2);
      const dueDate = new Date(due.getTime() - due.getTimezoneOffset() * 60000).toISOString().split('T')[0];
      
      // Get System staff record ID for Created By field
      const systemStaff = await base("Staff")
        .select({
          filterByFormula: "{Name}='System'",
          maxRecords: 1,
        })
        .firstPage();
      
      const systemStaffId = systemStaff.length > 0 ? systemStaff[0].id : null;
      
      // Prepare the Tasks table record using field IDs for reliability
      const tasksRecord = {
        fields: {
          // Field ID mappings for Tasks table (tblCOusVRFrciv4Ck):
          // fldBSR0tivzKCwIYX = "📌 Task"
          // fld5zfFg0A2Kzfw8W = "📖 Task Detail" 
          // fldwLSc95ITdPTA7j = "🚨 Urgency"
          // fldcOYboUu2vDASCl = "🚀 Status"
          // fldHx3or8FILZuGE2 = "👩 Created By"
          // fld15xSpsrFIO0ONh = "👨 Assigned Staff"
          // fldo7oJ0uwiwhNzmH = "👤 Assigned Applicant"
          // fldJ6mb4TsamGXMFh = "📆 Due Date"
          // fldyq3GebxaY3S9oM = "Onboarding Task ID"
          // flddxTSDbSiHOD0a2 = "Completed Date"
          // fldcXwC0PBEjUX9ZB = "Flagged Reason"
          // fldf8A3QyMjHKxnKR = "Onboarding Tasks Logs" (linked record; Display Resource Link is looked up from this)
          
          // 📌 Task - Admin-facing, clear, professional
          // Example: "Verify completion – Shannon Mantle: Online payments via Stripe"
          "fldBSR0tivzKCwIYX": `Verify completion – ${applicantName}: ${taskTitle || "Task"}`,
          // 📖 Task Detail - What happened and what the admin should do next
          "fld5zfFg0A2Kzfw8W": `${applicantName} marked "${taskTitle}" as completed on ${currentDateTime}.\n\nPlease review and confirm the task has been completed to the expected standard. If evidence or documentation is missing, flag the task with a clear reason. If the task is satisfactory, mark this task as Completed.`,
          "fldwLSc95ITdPTA7j": "Low", // 🚨 Urgency - Completed tasks are low priority
          "fldcOYboUu2vDASCl": "In-progress", // 🚀 Status
          "fldHx3or8FILZuGE2": systemStaffId ? [systemStaffId] : [], // 👩 Created By - System staff
          "fld15xSpsrFIO0ONh": [], // 👨 Assigned Staff - Empty (global task)
          "fldo7oJ0uwiwhNzmH": [applicantId], // 👤 Assigned Applicant - The hire who completed it
          "fldJ6mb4TsamGXMFh": dueDate, // 📆 Due Date - 2 working days from today
          "fldyq3GebxaY3S9oM": taskId, // Onboarding Task ID - Original Onboarding Tasks Logs record ID
          "fldf8A3QyMjHKxnKR": [taskId], // Onboarding Tasks Logs (linked record) - Lookup "Display Resource Link" pulls from this
          "flddxTSDbSiHOD0a2": currentDate, // Completed Date - When it was completed
          "fldcXwC0PBEjUX9ZB": "" // Flagged Reason - Empty for completed tasks
        }
      };

      // Create the record in Tasks table
      const createdTaskRecord = await base("Tasks").create([tasksRecord]);
      tasksRecordId = createdTaskRecord[0].id;
      
      logger.info("Successfully created Tasks record for completed task:", {
        taskId: taskId,
        applicantName: applicantName,
        tasksRecordId: tasksRecordId,
        completedDate: currentDate
      });

    } catch (tasksError) {
      // Log the error and include it in the response
      logger.error("Failed to create Tasks record for completed task:", {
        taskId: taskId,
        applicantName: applicantName,
        error: tasksError.message,
        stack: tasksError.stack
      });
      
      // Don't fail the entire operation, but log the error
      console.error("Tasks creation failed:", tasksError);
    }

    // 5. Send the response with Tasks creation status
    const responsePayload = {
      message: `Task completed successfully for applicant: ${applicantName}`,
      recordId: applicantId,
      interfaceMessage: updatedMessage,
      tasksRecordCreated: tasksRecordId ? true : false,
      tasksRecordId: tasksRecordId
    };
    const response = Response.json(responsePayload);

    // 6. Non-critical operations: update interface message and log audit event.
    base("Applicants").update([
      {
        id: applicantId,
        fields: {
          "Interface Message - Onboarding Status Update": updatedMessage,
        },
      },
    ]).catch((err) => logger.error("Interface message update error: ", err));

    logAuditEvent({
      base,
      eventType: "Task Complete",
      eventStatus: "Success",
      userIdentifier: userEmail,
      userName,
      userRole,
      detailedMessage: `User successfully completed task. Task ID: ${taskId}`,
      request,
    }).catch((err) => logger.error("Audit log error: ", err));

    // Send notification to admin/manager (replace 'ADMIN_RECORD_ID' with actual logic)
    const admins = await base("Staff")
      .select({
        filterByFormula: "{IsAdmin}=TRUE()",
        fields: ["Name", "Email"],
      })
      .firstPage();
    await Promise.all(admins.map(admin =>
      createNotification({
        title: "Task Completed",
        body: `${applicantName} has completed the task: \"${taskTitle}\".`,
        type: "Task",
        severity: "Success",
        recipientId: admin.id,
        actionUrl: `https://yourapp.com/tasks/${taskId}`,
        source: "System"
      })
    ));

    return response;
  } catch (error) {
    logger.error("Full Error:", {
      message: error.message,
      stack: error.stack,
    });

    logAuditEvent({
      base,
      eventType: "Task Complete",
      eventStatus: "Error",
      userIdentifier: userEmail,
      detailedMessage: `User task completion error: ${error}`,
      request,
    }).catch((err) => logger.error("Audit log error in catch:", err));

    return Response.json(
      {
        error: "Internal server error",
        details: process.env.NODE_ENV === "development" ? error.message : null,
      },
      { status: 500 }
    );
  }
}