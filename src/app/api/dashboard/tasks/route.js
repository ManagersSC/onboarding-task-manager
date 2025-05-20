import { getTasksWithCreator } from '@/lib/utils/dashboard/tasks';
import Airtable from 'airtable';
import { logAuditEvent } from '@/lib/auditLogger';
import { cookies } from "next/headers";
import { unsealData } from "iron-session";

export async function GET(req) {
  try {
    const tasks = await getTasksWithCreator();
    return new Response(JSON.stringify({ tasks }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
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