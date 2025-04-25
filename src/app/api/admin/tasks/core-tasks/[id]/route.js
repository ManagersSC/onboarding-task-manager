import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import logger from "@/lib/logger"
import { logAuditEvent } from "@/lib/auditLogger"

export async function GET(request, { params }) {
  const p = await params
  const id = p.id

  const sessionCookie = (await cookies()).get("session")?.value
  if (!sessionCookie) return new Response(null, { status: 401 })
  let session
  try {
    session = await unsealData(sessionCookie, 
        { 
            password: process.env.SESSION_SECRET, 
            ttl: 60*60*8 
        }
    )
  } catch (err) {
    return Response.json(
        { error: "Invalid Session", details: process.env.NODE_ENV === "development" ? err.message : null },
        { status: 401 }
    )
  }
  if (session.userRole !== "admin") return new Response(null, { status: 403 })

  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    logger.error("Missing Airtable credentials")
    return new Response(null, { status: 500 })
  }

  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)
  try {
    const record = await base('Onboarding Tasks').find(id)
    const task = {
      id: record.id,
      title: record.fields['Task'] || '',
      description: record.fields['Task Body'] || '',
      type: record.fields['Type'] || '',
      week: record.fields['Week Number']?.toString() || '',
      day: record.fields['Day Number']?.toString() || '',
      folderName: record.fields['Folder Name'] || '',
      job: record.fields['Job'] || '',
      location: record.fields['Location'] || '',
      resourceUrl: record.fields['Link'] || '',
    }
    return new Response(JSON.stringify({ task }), { status: 200 })
  } catch (error) {
    logger.error('Error fetching record', error)
    logAuditEvent({ 
        eventType: 'Fetch Single Query', 
        eventStatus: 'Error', 
        userName: session.userName,
        userRole: session.userRole,
        userIdentifier: session.userEmail, 
        detailedMessage: error.message 
    })
    return new Response(null, { status: 500 })
  }
}

export async function PATCH(request, { params }) {
  const p = await params;
  const id = p.id;

  const sessionCookie = (await cookies()).get("session")?.value;
  if (!sessionCookie) return new Response(null, { status: 401 });

  let session;
  try {
    session = await unsealData(sessionCookie, { 
      password: process.env.SESSION_SECRET, 
      ttl: 60 * 60 * 8 
    });
  } catch (err) {
    return Response.json({ error: "Invalid Session" }, { status: 401 });
  }

  if (session.userRole !== "admin") return new Response(null, { status: 403 });

  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    logger.error("Missing Airtable credentials");
    return new Response(null, { status: 500 });
  }

  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
  const body = await request.json();

  const fieldsToUpdate = {};

  if (body.title) fieldsToUpdate["Task"] = body.title;
  if (body.description) fieldsToUpdate["Task Body"] = body.description;
  if (body.type) fieldsToUpdate["Type"] = body.type;
  if (body.week) fieldsToUpdate["Week Number"] = body.week;
  if (body.day) fieldsToUpdate["Day Number"] = body.day;
  if (body.folderName) fieldsToUpdate["Folder Name"] = body.folderName;
  if (body.job) fieldsToUpdate["Job"] = body.job;
  if (body.location) fieldsToUpdate["Location"] = body.location;
  if (body.resourceUrl) fieldsToUpdate["Link"] = body.resourceUrl;  

  try {
    await base('Onboarding Tasks').update([
      {
        id,
        fields: fieldsToUpdate,
      }
    ]);

    logAuditEvent({
      eventType: 'Task Update',
      eventStatus: 'Success',
      userIdentifier: session.userEmail,
      detailedMessage: `Task ${id} updated successfully`,
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    logger.error('Error updating record', error);
    logAuditEvent({
      eventType: 'Task Update',
      eventStatus: 'Error',
      userName: session.userName,
      userRole: session.userRole,
      userIdentifier: session.userEmail,
      detailedMessage: error.message,
    });
    return new Response(null, { status: 500 });
  }
}
