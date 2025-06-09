import { completeStaffTask, deleteStaffTask, editStaffTask } from "@/lib/utils/dashboard/tasks";
import Airtable from "airtable";
import { logAuditEvent } from "@/lib/auditLogger";
import { cookies } from "next/headers";
import { unsealData } from "iron-session";
import { createNotification } from '@/lib/notifications';

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
      // Fetch task record to get title, assigned staff, and creator
      if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) break;
      const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
      const record = await base("Tasks").find(id);
      const taskTitle = record.fields["📌 Task"] || "Untitled Task";
      const assigned = Array.isArray(record.fields["👨 Assigned Staff"]) ? record.fields["👨 Assigned Staff"][0] : null;
      const creator = Array.isArray(record.fields["👩 Created By"]) ? record.fields["👩 Created By"][0] : null;
      // Get the current user (completer) record id if available
      let completerId = null;
      try {
        const staffRecords = await base("Staff")
          .select({ filterByFormula: `{Email} = '${userEmail}'`, maxRecords: 1 })
          .firstPage();
        if (staffRecords.length > 0) completerId = staffRecords[0].id;
      } catch {}
      // Always notify the creator (if exists and not the completer)
      if (creator && creator !== completerId) {
        await createNotification({
          title: "Task Completed",
          body: `Your task \"${taskTitle}\" assigned to staff has been completed by ${userName}.`,
          type: "Task Completion",
          severity: "Success",
          recipientId: creator,
          actionUrl: '',
          source: 'System',
        });
      }
      // Optionally, notify assigned staff if someone else completed their task
      if (assigned && assigned !== completerId) {
        await createNotification({
          title: "Task Completed",
          body: `Task \"${taskTitle}\" was marked complete by ${userName}.`,
          type: "Task Completion",
          severity: "Success",
          recipientId: assigned,
          actionUrl: '',
          source: 'System',
        });
      }
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
        // Notify assigned staff
        const assigned = Array.isArray(updated.fields["👨 Assigned Staff"]) ? updated.fields["👨 Assigned Staff"][0] : null;
        if (assigned) {
          await createNotification({
            title: "Task Updated",
            body: `A task you were assigned (\"${fields.title || updated.fields["📌 Task"] || id}\") has been updated.`,
            type: "Task Update",
            severity: "Info",
            recipientId: assigned,
            actionUrl: '',
            source: 'System',
          });
        }
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
    // Fetch task record to get assigned staff
    if (process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID) {
      const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
      try {
        const record = await base("Tasks").find(id);
        const assigned = Array.isArray(record.fields["👨 Assigned Staff"]) ? record.fields["👨 Assigned Staff"][0] : null;
        if (assigned) {
          await createNotification({
            title: "Task Deleted",
            body: `A task you were assigned (ID: ${id}) has been deleted.`,
            type: "Task Deletion",
            severity: "Warning",
            recipientId: assigned,
            actionUrl: '',
            source: 'System',
          });
        }
      } catch {}
    }
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
      blockedReason: record.fields["Blocked Reason"] || "",
    };
    return new Response(JSON.stringify({ task }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
  