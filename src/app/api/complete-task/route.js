import Airtable from "airtable";
import { cookies } from "next/headers";
import logger from "@/lib/logger";
import { logAuditEvent } from "@/lib/auditLogger";

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

    // 1. Kick off update of the Status field in the Onboarding Tasks Logs table.
    const updatePromise = base("Onboarding Tasks Logs").update([
      {
        id: taskId,
        fields: {
          Status: "Completed",
        },
      },
    ]);

    // 2. In parallel, fetch applicant record and task log record.
    const applicantQuery = base("Applicants")
      .select({
        filterByFormula: `{Email}='${userEmail}'`,
        maxRecords: 1,
      })
      .firstPage();
    const taskLogPromise = base("Onboarding Tasks Logs").find(taskId);

    // Wait for all promises concurrently.
    const [updateResult, applicantRecords, taskLogRecord] = await Promise.all([
      updatePromise,
      applicantQuery,
      taskLogPromise,
    ]);

    if (!applicantRecords || applicantRecords.length === 0) {
      return Response.json({ error: "No applicant found for this email" }, { status: 404 });
    }

    const applicantRecord = applicantRecords[0];

    // 3. Generate New Interface Message.
    const applicantId = applicantRecord.id;
    const applicantName = applicantRecord.fields["Name"] || "Unknown";
    const taskTitle = taskLogRecord.fields["Task Title"] || "a task";
    const interfaceMessage = applicantRecord.fields["Interface Message - Onboarding Status Update"] || "";
    const currentDateTime = new Date().toLocaleString("en-GB");

    const newLine = `- ${applicantName} has completed ${taskTitle} with record ID: ${taskId} at ${currentDateTime}`;
    const updatedMessage = interfaceMessage ? `${interfaceMessage}\n${newLine}` : newLine;

    // 4. Send the response immediately.
    const responsePayload = {
      message: `Task completed successfully for applicant: ${applicantName}`,
      recordId: applicantId,
      interfaceMessage: updatedMessage,
    };
    const response = Response.json(responsePayload);

    // 5. Non-critical operations: update interface message and log audit event.
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

    return response;
  } catch (error) {
    logger.error("Full Error:", {
      message: error.message,
      stack: error.stack,
    });

    logAuditEvent({
      base,
      eventType: "Task Complete",
      eventStatus: "Error", // Changed from "Success" to "Error" for clarity.
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
