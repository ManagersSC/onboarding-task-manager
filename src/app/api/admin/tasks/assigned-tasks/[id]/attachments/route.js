import { cookies } from "next/headers";
import { sealData, unsealData } from "iron-session";
import Airtable from "airtable";
import logger from "@/lib/utils/logger";
import { logAuditEvent } from "@/lib/auditLogger";
import { createNotification } from "@/lib/notifications";
import { NOTIFICATION_TYPES } from "@/lib/notification-types";

// GET: Fetch attachments for a log record
export async function GET(request, { params }) {
  const { id } = params;
  // Auth
  const sessionCookie = (await cookies()).get("session")?.value;
  if (!sessionCookie) return new Response(null, { status: 401 });
  let session;
  try {
    session = await unsealData(sessionCookie, {
      password: process.env.SESSION_SECRET,
      ttl: 60 * 60 * 8,
    });
  } catch (err) {
    return new Response(null, { status: 401 });
  }
  if (session.userRole !== "admin") return new Response(null, { status: 403 });
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    return new Response(null, { status: 500 });
  }
  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
    process.env.AIRTABLE_BASE_ID
  );
  try {
    const record = await base("Onboarding Tasks Logs").find(id);
    const attachments = record.fields["File(s)"] || [];
    return new Response(JSON.stringify({ attachments }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    logger.error("Error fetching attachments:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// PATCH: Update attachments for a log record
export async function PATCH(request, { params }) {
  const { id } = params;
  // Auth
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  if (!sessionCookie) return new Response(null, { status: 401 });
  let session;
  try {
    session = await unsealData(sessionCookie, {
      password: process.env.SESSION_SECRET,
      ttl: 60 * 60 * 8,
    });
  } catch (err) {
    return new Response(null, { status: 401 });
  }
  if (session.userRole !== "admin") return new Response(null, { status: 403 });
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
    process.env.AIRTABLE_BASE_ID
  );
  try {
    const formData = await request.formData();
    const renamesInput = formData.get("renames");
    const removalsInput = formData.get("removeIds");
    const newFiles = formData.getAll("newFiles");
    const renames = renamesInput ? JSON.parse(renamesInput) : [];
    const removals = removalsInput ? JSON.parse(removalsInput) : [];

    // Fetch the current record
    const record = await base("Onboarding Tasks Logs").find(id);
    const existingAttachments = record.fields["File(s)"] || [];

    // Build the final list of attachments for the update payload
    let finalAttachments = existingAttachments.filter(
      (att) => !removals.includes(att.id)
    );
    // Apply renames
    finalAttachments = finalAttachments.map((att) => {
      const rename = renames.find((r) => r.fileId === att.id);
      if (rename) {
        return { ...att, filename: rename.newFilename };
      }
      return att;
    });

    // Update Airtable record for removals/renames
    await base("Onboarding Tasks Logs").update([
      {
        id: id,
        fields: { "File(s)": finalAttachments },
      },
    ]);

    // Upload new files
    if (newFiles.length > 0) {
      for (const file of newFiles) {
        await uploadFileViaJson(id, "File(s)", file);
      }
      // Fetch all admins
      const admins = await base("Staff")
        .select({
          filterByFormula: "{IsAdmin}=TRUE()",
          fields: ["Name", "Email"],
        })
        .firstPage();
      const fileNames = newFiles.map(f => f.name).join(", ");
      await Promise.all(admins.map(admin =>
        createNotification({
          title: "Document Uploaded",
          body: `New document(s) uploaded: ${fileNames}.
`,
          type: NOTIFICATION_TYPES.DOCUMENT_UPLOAD,
          severity: "Info",
          recipientId: admin.id,
          actionUrl: `https://yourapp.com/onboarding-tasks-logs/${id}`,
          source: "System"
        })
      ));
    }

    // Fetch the final state after all operations
    const updatedRec = await base("Onboarding Tasks Logs").find(id);
    const updatedAttachments = updatedRec.fields["File(s)"] || [];

    return new Response(
      JSON.stringify({ attachments: updatedAttachments }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    logger.error(`Error updating attachments for log ID ${id}:`, err);
    return new Response(
      JSON.stringify({ error: "Failed to update attachments" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// Helper for file upload
async function uploadFileViaJson(recordId, fieldName, file) {
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const body = {
    contentType: file.type || "application/octet-stream",
    filename: file.name,
    file: base64,
  };
  const url = `https://content.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${recordId}/${encodeURIComponent(fieldName)}/uploadAttachment`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Upload failed (${resp.status}): ${text}`);
  }
  return resp.json();
} 