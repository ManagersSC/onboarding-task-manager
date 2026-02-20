import Airtable from "airtable";
import { cookies } from "next/headers";
import { unsealData } from "iron-session";
import { logAuditEvent } from "@/lib/auditLogger";

// POST /api/dashboard/tasks/claim-all
// Body: { applicantId: string, taskIds?: string[] }
export async function POST(req) {
  let userEmail = "Unknown";
  let userName = "Unknown";
  let userRole = "Unknown";
  let userStaffId = null;

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
      userStaffId = session.userStaffId || null;
    }
  } catch {}

  if (!userStaffId) {
    return new Response(JSON.stringify({ error: "User staff ID not found in session" }), { status: 401 });
  }

  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    return new Response(JSON.stringify({ error: "Airtable environment variables are missing" }), { status: 500 });
  }

  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

  try {
    const body = await req.json();
    const { applicantId, taskIds } = body || {};

    if (!applicantId && (!Array.isArray(taskIds) || taskIds.length === 0)) {
      return new Response(
        JSON.stringify({ error: "Provide applicantId or a non-empty taskIds array" }),
        { status: 400 }
      );
    }

    let candidateTasks = [];

    if (Array.isArray(taskIds) && taskIds.length > 0) {
      // Fetch specified tasks
      const records = await Promise.all(
        taskIds.map(async (id) => {
          try { return await base("Tasks").find(id); } catch { return null; }
        })
      );
      candidateTasks = records.filter(Boolean);
      // If applicantId provided, filter to those linked to that applicant
      if (applicantId) {
        candidateTasks = candidateTasks.filter(r =>
          Array.isArray(r.fields["👤 Assigned Applicant"]) && r.fields["👤 Assigned Applicant"].includes(applicantId)
        );
      }
    } else if (applicantId) {
      // Broad fetch: unclaimed, not completed; filter by applicant in code
      const unclaimed = await base("Tasks")
        .select({
          filterByFormula: "AND( OR({👨 Assigned Staff} = '', NOT({👨 Assigned Staff})), NOT({🚀 Status} = 'Completed') )",
        })
        .all();
      candidateTasks = unclaimed.filter(r =>
        Array.isArray(r.fields["👤 Assigned Applicant"]) && r.fields["👤 Assigned Applicant"].includes(applicantId)
      );
    }

    if (candidateTasks.length === 0) {
      return new Response(JSON.stringify({ claimed: [], alreadyClaimed: [], errors: [], total: 0 }), { status: 200 });
    }

    const toClaim = [];
    const alreadyClaimed = [];

    for (const rec of candidateTasks) {
      const alreadyHasStaff = Array.isArray(rec.fields["👨 Assigned Staff"]) && rec.fields["👨 Assigned Staff"].length > 0;
      if (alreadyHasStaff) {
        alreadyClaimed.push(rec.id);
      } else {
        toClaim.push(rec.id);
      }
    }

    const claimed = [];
    const errors = [];

    // Chunk updates to respect API limits
    const chunkSize = 10;
    for (let i = 0; i < toClaim.length; i += chunkSize) {
      const chunk = toClaim.slice(i, i + chunkSize);
      try {
        const updated = await base("Tasks").update(
          chunk.map((id) => ({
            id,
            fields: {
              "👨 Assigned Staff": [userStaffId],
              "Claimed Date": new Date().toISOString(),
            },
          }))
        );
        claimed.push(...updated.map((u) => u.id));
      } catch (e) {
        errors.push({ ids: chunk, message: e.message });
      }
    }

    try {
      await logAuditEvent({
        eventType: "Task Claim-All",
        eventStatus: errors.length > 0 ? "Partial" : "Success",
        userRole,
        userName,
        userIdentifier: userEmail,
        detailedMessage: `Claimed ${claimed.length} tasks; already claimed ${alreadyClaimed.length}.`,
        request: req,
      });
    } catch {}

    return new Response(
      JSON.stringify({ claimed, alreadyClaimed, errors, total: claimed.length + alreadyClaimed.length }),
      { status: 200 }
    );
  } catch (error) {
    try {
      await logAuditEvent({
        eventType: "Task Claim-All",
        eventStatus: "Error",
        userRole,
        userName,
        userIdentifier: userEmail,
        detailedMessage: `Claim-all failed: ${error.message}`,
        request: req,
      });
    } catch {}
    return new Response(JSON.stringify({ error: "Failed to claim tasks" }), { status: 500 });
  }
}


