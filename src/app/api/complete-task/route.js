import Airtable from "airtable";
import { cookies } from "next/headers";
import logger from "@/lib/logger";
import { logAuditEvent } from "@/lib/auditLogger";

// Complete tasks
export async function POST(request) {
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    logger.error("ctServer configuration error: Missing API key or base ID");
    return Response.json({ error: "Server configuration error" }, { status: 500 });
  }

  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
    .base(process.env.AIRTABLE_BASE_ID);

  let userEmail; // Declare here so that it’s available in both try and catch.
  try {
    const { taskId } = await request.json();
    logger.info("ctReceived request with taskId:", taskId);
    if (!taskId) {
      logger.error("ctMissing taskId in request body");
      return Response.json({ error: "Missing taskId" }, { status: 400 });
    }

    const cookieStore = await cookies();
    userEmail = cookieStore.get("user_email")?.value;
    logger.info("User email from cookies:", userEmail);
    if (!userEmail) {
      logger.error("ctUnauthorized access: No user_email found in cookies");
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update the Status field in the Onboarding Tasks Logs table.
    const updateResult = await base("Onboarding Tasks Logs").update([
      {
        id: taskId,
        fields: {
          Status: "Completed",
        },
      },
    ]);

    logger.info("ctUpdate result:", updateResult);
    logger.info("ctTask completed successfully for task log record:", taskId);

    // Get Applicant Record.
    const applicantRecords = await base("Applicants")
      .select({
        filterByFormula: `{Email}='${userEmail}'`,
        maxRecords: 1,
      })
      .firstPage();

    if (!applicantRecords || applicantRecords.length === 0) {
      return Response.json({ error: "No applicant found for this email" }, { status: 404 });
    }

    const applicantRecord = applicantRecords[0];

    // Get Task Title.
    const taskLogRecord = await base("Onboarding Tasks Logs").find(taskId);
    const taskTitle = taskLogRecord.fields["Task Title"] || "a task";

    // Generate New Interface Message.
    const applicantId = applicantRecord.id;
    const applicantName = applicantRecord.fields["Name"] || "Unknown";
    const interfaceMessage = applicantRecord.fields["Interface Message - Onboarding Status Update"] || "";
    const currentDateTime = new Date().toLocaleString("en-GB");

    const newLine = `- ${applicantName} has completed ${taskTitle} with record ID: ${taskId} at ${currentDateTime}`;
    const updatedMessage = interfaceMessage ? `${interfaceMessage}\n${newLine}` : newLine;

    // Update Interface Message.
    await base("Applicants").update([
      {
        id: applicantId,
        fields: {
          "Interface Message - Onboarding Status Update": updatedMessage,
        },
      },
    ]);

    // Log success completion.
    await logAuditEvent({
      base,
      eventType: "Task Complete",
      eventStatus: "Success",
      userIdentifier: userEmail,
      detailedMessage: `User successfully completed task. Task ID: ${taskId}`,
      request,
    });

    return Response.json({
      message: `Task completed successfully for applicant: ${applicantName}`,
      recordId: applicantId,
      interfaceMessage: updatedMessage,
    });
  } catch (error) {
    logger.error("Full Error:", {
      message: error.message,
      stack: error.stack,
    });

    await logAuditEvent({
      base,
      eventType: "Task Complete",
      eventStatus: "Error", // Changed from "Success" to "Error" for clarity.
      userIdentifier: userEmail,
      detailedMessage: `User task completion error: ${error}`,
      request,
    });

    return Response.json(
      {
        error: "Internal server error",
        details: process.env.NODE_ENV === "development" ? error.message : null,
      },
      { status: 500 }
    );
  }
}
