import { getTasksWithCreator } from '@/lib/utils/dashboard/tasks';
import Airtable from 'airtable';
import { logAuditEvent } from '@/lib/auditLogger';
import { cookies } from "next/headers";
import { unsealData } from "iron-session";

export async function GET(req) {
  try {
    // Get userName from session
    let userName = null;
    try {
      const cookieStore = await cookies();
      const sealedSession = cookieStore.get("session")?.value;
      if (sealedSession) {
        const session = await unsealData(sealedSession, {
          password: process.env.SESSION_SECRET,
        });
        userName = session.userName;
      }
    } catch (e) {
      console.error("Session extraction error:", e);
    }

    if (!userName) {
      console.error("No userName found in session");
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
    }

    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      console.error("Airtable environment variables are missing");
      return new Response(
        JSON.stringify({ error: 'Airtable environment variables are missing' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

    // Build filter formula
    const filterFormula = `AND(
      OR(
        {👨 Assigned Staff} = '',
        {Assigned Staff Name} = '${userName}'
      ),
      NOT({🚀 Status} = 'Completed')
    )`;
    console.log("userName:", userName);
    console.log("filterByFormula:", filterFormula);

    let tasks = [];
    try {
      tasks = await base('Tasks')
        .select({ filterByFormula: filterFormula })
        .all();
    } catch (airtableErr) {
      console.error("Airtable fetch error:", airtableErr);
      return new Response(
        JSON.stringify({ error: 'Airtable fetch error', details: airtableErr.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (tasks.length > 0) {
      console.log("First returned record fields:", tasks[0].fields);
    } else {
      console.log("No tasks returned for userName:", userName);
    }

    // Map tasks to match frontend expectations
    const mappedTasks = tasks.map(task => ({
      id: task.id,
      title: task.fields["📌 Task"] || "",
      description: task.fields["📖 Task Detail"] || "",
      rawDueDate: task.fields["📆 Due Date"] || "",
      priority: task.fields["🚨 Urgency"] || "medium",
      status: (task.fields["🚀 Status"] || "").toLowerCase().trim(),
      createdBy: Array.isArray(task.fields["👩 Created By"]) ? task.fields["👩 Created By"][0] : (task.fields["👩 Created By"] || ""),
      for: Array.isArray(task.fields["Assigned Staff Name"]) ? task.fields["Assigned Staff Name"][0] : (task.fields["Assigned Staff Name"] || ""),
      flaggedReason: task.fields["Flagged Reason"] || "",
    }));

    // Group by status (upcoming, overdue, flagged)
    const grouped = { upcoming: [], overdue: [], flagged: [] };
    function getStatusGroup(status) {
      const normalizedStatus = (status || "").toLowerCase().trim();
      if (normalizedStatus === "today" || normalizedStatus === "in-progress") {
        return "upcoming";
      } else if (normalizedStatus === "overdue") {
        return "overdue";
      } else if (normalizedStatus === "flagged") {
        return "flagged";
      }
      return "upcoming";
    }
    for (const task of mappedTasks) {
      const group = getStatusGroup(task.status);
      if (grouped[group]) {
        grouped[group].push(task);
      } else {
        grouped.upcoming.push(task);
      }
    }

    return new Response(JSON.stringify({ tasks: grouped }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("General GET error:", error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch tasks', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function POST(req) {
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
  } catch (e) {
    // If session parsing fails, keep Unknowns
  }

  try {
    const body = await req.json();
    const { title, description, assignTo, urgency, dueDate, createdBy, createdById } = body;

    // Validate required fields
    if (!title || !assignTo || !urgency || !dueDate || !createdBy) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      return new Response(
        JSON.stringify({ error: 'Airtable environment variables are missing' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

    // Map frontend fields to Airtable fields (ATS schema)
    const airtableFields = {
      '📌 Task': title,
      '📖 Task Detail': description || '',
      '👨 Assigned Staff': [assignTo], // expects array of record IDs
      '🚨 Urgency': urgency,
      '📆 Due Date': dueDate,
      '👩 Created By': createdById ? [createdById] : [],
      '🚀 Status': 'In-progress', // default status
    };

    // Create the record in Airtable
    const createdRecords = await base('Tasks').create([{ fields: airtableFields }]);
    const createdRecord = createdRecords[0];

    // Audit log
    await logAuditEvent({
      eventType: 'Admin Task Created',
      eventStatus: 'Success',
      userRole,
      userName,
      userIdentifier: userEmail,
      detailedMessage: `Task '${title}' created and assigned to staff ID ${assignTo}.`,
      request: req,
    });

    return new Response(
      JSON.stringify({ task: createdRecord }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    // Audit log failure
    try {
      await logAuditEvent({
        eventType: 'Server',
        eventStatus: 'Error',
        userRole: userRole || 'Unknown',
        userName: userName || 'Unknown',
        userIdentifier: userEmail || 'Unknown',
        detailedMessage: `Task creation failed for staff: ${error.message}`,
        request: req,
      });
    } catch {}
    return new Response(
      JSON.stringify({ error: 'Failed to create task', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}