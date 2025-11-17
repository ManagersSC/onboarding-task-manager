import { completeStaffTask, deleteStaffTask, editStaffTask, claimStaffTask } from "@/lib/utils/dashboard/tasks";
import Airtable from "airtable";
import { logAuditEvent } from "@/lib/auditLogger";
import { cookies } from "next/headers";
import { unsealData } from "iron-session";

// src/app/api/dashboard/tasks/[id]/route.js

export async function PATCH(req, { params }){
  // --- Get session for audit logging ---
  let userEmail = "Unknown";
  let userName = "Unknown";
  let userRole = "Unknown";
  try {
    const cookieStore = await cookies();
    const sealedSession = cookieStore.get("session")?.value;
    if (sealedSession) {
      const session = await unsealData(sealedSession, {
        password: process.env.SESSION_SECRET,
      });
      userEmail = session.userEmail || "Unknown";
      userName = session.userName || "Unknown";
      userRole = session.userRole || "Unknown";
    }
  } catch (e) {}

  const p = await params;
  const { action, ...fields } = await req.json();
  const { id } = p;

  switch (action){
    case "complete":
      await completeStaffTask(id);
      break;
    case "block":
      break;
    case "delete":
      break;
    case "edit":
      try {
        const updated = await editStaffTask(id, fields);
        await logAuditEvent({
          eventType: 'Admin Task Updated',
          eventStatus: 'Success',
          userRole,
          userName,
          userIdentifier: userEmail,
          detailedMessage: `Task '${fields.title || id}' updated by ${userName} (${userEmail}).`,
          request: req,
        });
        return new Response(JSON.stringify({ success: true, task: updated }), { status: 200 });
      } catch (e) {
        console.error("PATCH error:", e);
        await logAuditEvent({
          eventType: 'Admin Task Updated',
          eventStatus: 'Error',
          userRole,
          userName,
          userIdentifier: userEmail,
          detailedMessage: `Task update failed for task ID ${id}. Error: ${e.message}`,
          request: req,
        });
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
      }
    case "flag":
      try {
        const reason = (fields && fields.flaggedReason) || '';
        // get staff id for metadata
        let userStaffId = null;
        try {
          const cookieStore = await cookies();
          const sealedSession = cookieStore.get("session")?.value;
          if (sealedSession) {
            const session = await unsealData(sealedSession, {
              password: process.env.SESSION_SECRET,
            });
            userStaffId = session.userStaffId || null;
          }
        } catch {}
        const updateFields = {
          status: 'Flagged',
          flaggedReason: reason,
          // Only include flaggedById if we have a real record id
          ...(userStaffId ? { flaggedById: userStaffId } : {}),
          flaggedAt: new Date().toISOString(),
          // Do not send empty arrays for link fields
          flagResolvedAt: null,
        };
        const updated = await editStaffTask(id, updateFields);
        await logAuditEvent({
          eventType: 'Task Flagged',
          eventStatus: 'Success',
          userRole,
          userName,
          userIdentifier: userEmail,
          detailedMessage: `Task '${id}' flagged by ${userName}.`,
          request: req,
        });
        return new Response(JSON.stringify({ success: true, task: updated }), { status: 200 });
      } catch (e) {
        await logAuditEvent({
          eventType: 'Task Flagged',
          eventStatus: 'Error',
          userRole,
          userName,
          userIdentifier: userEmail,
          detailedMessage: `Task flag failed for task ID ${id}. Error: ${e.message}`,
          request: req,
        });
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
      }
    case "resolveFlag":
      try {
        let userStaffId = null;
        try {
          const cookieStore = await cookies();
          const sealedSession = cookieStore.get("session")?.value;
          if (sealedSession) {
            const session = await unsealData(sealedSession, {
              password: process.env.SESSION_SECRET,
            });
            userStaffId = session.userStaffId || null;
          }
        } catch {}
        const updated = await editStaffTask(id, {
          status: 'In-progress',
          flaggedReason: '',
          flagResolvedById: userStaffId,
          flagResolvedAt: new Date().toISOString(),
          resolutionNote: (fields && fields.resolutionNote) || '',
        });
        await logAuditEvent({
          eventType: 'Task Flag Resolved',
          eventStatus: 'Success',
          userRole,
          userName,
          userIdentifier: userEmail,
          detailedMessage: `Task '${id}' flag resolved by ${userName}.`,
          request: req,
        });
        return new Response(JSON.stringify({ success: true, task: updated }), { status: 200 });
      } catch (e) {
        await logAuditEvent({
          eventType: 'Task Flag Resolved',
          eventStatus: 'Error',
          userRole,
          userName,
          userIdentifier: userEmail,
          detailedMessage: `Task flag resolve failed for task ID ${id}. Error: ${e.message}`,
          request: req,
        });
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
      }
    case "resolveAndComplete":
      try {
        let userStaffId = null;
        try {
          const cookieStore = await cookies();
          const sealedSession = cookieStore.get("session")?.value;
          if (sealedSession) {
            const session = await unsealData(sealedSession, {
              password: process.env.SESSION_SECRET,
            });
            userStaffId = session.userStaffId || null;
          }
        } catch {}
        const updated = await editStaffTask(id, {
          status: 'Completed',
          flaggedReason: '',
          flagResolvedById: userStaffId,
          flagResolvedAt: new Date().toISOString(),
          resolutionNote: (fields && fields.resolutionNote) || '',
          for: [],
          claimedDate: null,
        });
        await logAuditEvent({
          eventType: 'Task Flag Resolved & Completed',
          eventStatus: 'Success',
          userRole,
          userName,
          userIdentifier: userEmail,
          detailedMessage: `Task '${id}' flag resolved and completed by ${userName}.`,
          request: req,
        });
        return new Response(JSON.stringify({ success: true, task: updated }), { status: 200 });
      } catch (e) {
        await logAuditEvent({
          eventType: 'Task Flag Resolved & Completed',
          eventStatus: 'Error',
          userRole,
          userName,
          userIdentifier: userEmail,
          detailedMessage: `Task resolve&complete failed for task ID ${id}. Error: ${e.message}`,
          request: req,
        });
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
      }
    case "claim":
      try {
        // Get the user's Airtable staff record ID from the session
        // Assume session.userStaffId is set (if not, adjust as needed)
        const cookieStore = await cookies();
        const sealedSession = cookieStore.get("session")?.value;
        let userStaffId = null;
        if (sealedSession) {
          const session = await unsealData(sealedSession, {
            password: process.env.SESSION_SECRET,
          });
          userStaffId = session.userStaffId;
        }
        if (!userStaffId) {
          return new Response(JSON.stringify({ error: "User staff ID not found in session" }), { status: 401 });
        }
        const updated = await claimStaffTask(id, userStaffId);
        await logAuditEvent({
          eventType: 'Task Claimed',
          eventStatus: 'Success',
          userRole,
          userName,
          userIdentifier: userEmail,
          detailedMessage: `Task '${id}' claimed by ${userName} (${userEmail}).`,
          request: req,
        });
        return new Response(JSON.stringify({ success: true, task: updated }), { status: 200 });
      } catch (e) {
        await logAuditEvent({
          eventType: 'Task Claimed',
          eventStatus: 'Error',
          userRole,
          userName,
          userIdentifier: userEmail,
          detailedMessage: `Task claim failed for task ID ${id}. Error: ${e.message}`,
          request: req,
        });
        return new Response(JSON.stringify({ error: e.message }), { status: e.message === "Task already claimed" ? 409 : 500 });
      }
    case "unclaim":
      try {
        const updated = await editStaffTask(id, { for: [], claimedDate: null });
        await logAuditEvent({
          eventType: 'Task Unclaimed',
          eventStatus: 'Success',
          userRole,
          userName,
          userIdentifier: userEmail,
          detailedMessage: `Task '${id}' unclaimed by ${userName} (${userEmail}).`,
          request: req,
        });
        return new Response(JSON.stringify({ success: true, task: updated }), { status: 200 });
      } catch (e) {
        await logAuditEvent({
          eventType: 'Task Unclaimed',
          eventStatus: 'Error',
          userRole,
          userName,
          userIdentifier: userEmail,
          detailedMessage: `Task unclaim failed for task ID ${id}. Error: ${e.message}`,
          request: req,
        });
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
      }
    default:
      return new Response(JSON.stringify({ error: "Invalid action" }), {status: 400});
  }
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}

export async function DELETE(req, { params }) {
  // --- Get session for audit logging ---
  let userEmail = "Unknown";
  let userName = "Unknown";
  let userRole = "Unknown";
  try {
    const cookieStore = await cookies();
    const sealedSession = cookieStore.get("session")?.value;
    if (sealedSession) {
      const session = await unsealData(sealedSession, {
        password: process.env.SESSION_SECRET,
      });
      userEmail = session.userEmail || "Unknown";
      userName = session.userName || "Unknown";
      userRole = session.userRole || "Unknown";
    }
  } catch (e) {}

  const p = await params;
  const { id } = p;
  try {
    await deleteStaffTask(id);
    await logAuditEvent({
      eventType: 'Admin Task Deleted',
      eventStatus: 'Success',
      userRole,
      userName,
      userIdentifier: userEmail,
      detailedMessage: `Task with ID ${id} deleted by ${userName} (${userEmail}).`,
      request: req,
    });
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e) {
    console.error("DELETE error:", e);
    await logAuditEvent({
      eventType: 'Admin Task Deleted',
      eventStatus: 'Error',
      userRole,
      userName,
      userIdentifier: userEmail,
      detailedMessage: `Task deletion failed for task ID ${id}. Error: ${e.message}`,
      request: req,
    });
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

export async function GET(req, { params }) {
  const p = await params;
  const { id } = params;
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    return new Response(JSON.stringify({ error: "Airtable environment variables are missing" }), { status: 500 });
  }
  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
  try {
    const record = await base("Tasks").find(id);
    if (!record) {
      return new Response(JSON.stringify({ error: "Task not found" }), { status: 404 });
    }
    // Map fields similar to getTasksWithCreator
    const task = {
      id: record.id,
      title: record.fields["📌 Task"] || "",
      description: record.fields["📖 Task Detail"] || "",
      rawDueDate: record.fields["📆 Due Date"] || "",
      priority: record.fields["🚨 Urgency"] || "medium",
      status: (record.fields["🚀 Status"] || "").toLowerCase().trim(),
      createdBy: record.fields["👩 Created By"] || "",
      for: record.fields["👨 Assigned Staff"] || "",
      flaggedReason: record.fields["Flagged Reason"] || "",
      taskType: record.fields["Task Type"] || "Standard",
    };
    return new Response(JSON.stringify({ task }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
  