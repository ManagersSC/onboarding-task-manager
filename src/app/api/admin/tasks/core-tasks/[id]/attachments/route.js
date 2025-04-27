import { cookies } from "next/headers";
import { unsealData } from "iron-session";
import Airtable from "airtable";
import logger from "@/lib/logger";
import { logAuditEvent } from "@/lib/auditLogger";
import { uploadFileViaJson } from "../route";

export async function GET(request, { params }) {
    const p = await params
    const { id } = p
    // 1) Authenticate
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

    // 2) Airtable init
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    return new Response(null, { status: 500 });
    }
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
        process.env.AIRTABLE_BASE_ID
    );

    // 3) Fetch record and return attachments
    try {
    const record = await base("Onboarding Tasks").find(id);
    const attachments = record.fields["File(s)"] || [];
    return new Response(JSON.stringify({ attachments }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
    } catch (err) {
        logger.error("Error fetching attachments:", err);
        logAuditEvent({ 
            eventType: 'Fetch Files', 
            eventStatus: 'Error', 
            userName: session.userName,
            userRole: session.userRole,
            userIdentifier: session.userEmail, 
            detailedMessage: err.message 
        })
        return new Response(
            JSON.stringify({ error: err.message }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}

export async function PATCH(request, { params }) {
  const p = await params;
  const { id } = p;

  // 1) Authenticate
  const sessionCookie = (await cookies()).get("session")?.value;
  if (!sessionCookie) return new Response(null, { status: 401 });
  let session;
  try {
      session = await unsealData(sessionCookie, {
          password: process.env.SESSION_SECRET,
          ttl: 60 * 60 * 8, // 8 hours
      });
  } catch (err) {
      logger.warn("Session unseal failed during PATCH attachments:", err);
      return new Response(null, { status: 401 });
  }
  if (session.userRole !== "admin") return new Response(null, { status: 403 });

  // 2) Airtable init
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      logger.error("Airtable credentials missing");
      return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
      process.env.AIRTABLE_BASE_ID
  );

  // 3) Process request and update Airtable
  try {
      const formData = await request.formData();
      const renamesInput = formData.get("renames");
      const removalsInput = formData.get("removeIds");

      const renames = renamesInput ? JSON.parse(renamesInput) : []; // Array of { fileId: 'att...', newFilename: '...' }
      const removals = removalsInput ? JSON.parse(removalsInput) : []; // Array of 'att...'
      const newFiles = formData.getAll("newFiles"); // Array of File objects

      logger.info(`Updating attachments for task ID: ${id}. Removals: ${removals.length}, Renames: ${renames.length}, New Files: ${newFiles.length}`);

      // Fetch the current record
      const record = await base("Onboarding Tasks").find(id);
      const existingAttachments = record.fields["File(s)"] || [];

      // --- Start of Change ---
      // Build the final list of attachments for the update payload
      const finalAttachments = [];
      for (const att of existingAttachments) {
          if (!att.id) {
              logger.warn(`Existing attachment missing ID for task ${id}:`, att);
              continue; // Skip attachments without an ID
          }

          // Check if removed
          if (removals.includes(att.id)) {
              logger.info(`Removing attachment ID: ${att.id} (${att.filename})`);
              continue; // Skip this one, don't add to finalAttachments
          }

          // Check if renamed
          const renameInfo = renames.find((r) => r.fileId === att.id);
          if (renameInfo) {
              if (!att.url) {
                  logger.warn(`Cannot rename attachment ID ${att.id} (${att.filename}) because it has no URL.`);
                  // Decide how to handle: skip rename or keep original? Keeping original seems safer.
                   finalAttachments.push({ url: att.url, filename: att.filename }); // Fallback to original if URL is missing for rename
              } else {
                  logger.info(`Renaming attachment ID: ${att.id} from "${att.filename}" to "${renameInfo.newFilename}"`);
                  finalAttachments.push({
                      url: att.url, // Use the original URL
                      filename: renameInfo.newFilename // Use the new filename
                  });
              }
          } else {
              if (att.url && att.filename) {
                  finalAttachments.push({ url: att.url, filename: att.filename });
              } else {
                   logger.warn(`Keeping existing attachment ID ${att.id} but it's missing URL or filename.`);
                   // You might need to decide if keeping the original object `att` works here,
                   // but ideally all existing attachments should have url/filename.
                   // Pushing the original object might include other fields Airtable doesn't expect on update.
                   // Let's skip if incomplete, though this could lead to data loss if URL/filename is missing.
                   // A safer alternative is to fetch the record again if properties are missing, but adds latency.
              }
          }
      }

      // Perform the single update for removals and renames
      logger.info(`Updating Airtable record ${id} with ${finalAttachments.length} final attachments (handling removals/renames).`);
      await base("Onboarding Tasks").update([
          {
              id: id,
              fields: { "File(s)": finalAttachments },
          },
      ]);
      logger.info(`Airtable record ${id} updated successfully for removals/renames.`);
      // --- End of Change ---


      // Upload new files - assuming uploadFileViaJson appends correctly
      if (newFiles.length > 0) {
          logger.info(`Uploading ${newFiles.length} new files for task ID: ${id}...`);
          for (const file of newFiles) {
               logger.debug(`Uploading file: ${file.name}`);
               await uploadFileViaJson(id, "File(s)", file); // Ensure this function handles errors and appends
          }
          logger.info(`Finished uploading ${newFiles.length} new files for task ID: ${id}.`);
      }

      // Fetch the final state after all operations
      const updatedRec = await base("Onboarding Tasks").find(id);
      const updatedAttachments = updatedRec.fields["File(s)"] || [];

      // Refresh cookie with new 8h TTL
      const newCookie = await sealData(session, {
        password: process.env.SESSION_SECRET,
        ttl: 60 * 60 * 8,
      });
      cookieStore.set({
        name: "session",
        value: newCookie,
        httpOnly: true,
        path: "/",
        maxAge: 60 * 60 * 8,
        secure: process.env.NODE_ENV === "production",
      });

      logAuditEvent({
        eventType: 'Update File(s)',
        eventStatus: 'Success',
        userName: session.userName,
        userRole: session.userRole,
        userIdentifier: session.userEmail,
        detailedMessage: `User updated files for task ${id}. Removals: ${removals.length}, Renames: ${renames.length}, Added: ${newFiles.length}. Final count: ${updatedAttachments.length}.`
      });

      return new Response(
          JSON.stringify({ attachments: updatedAttachments }),
          { status: 200, headers: { "Content-Type": "application/json" } }
      );
  } catch (err) {
      logger.error(`Error updating attachments for task ID ${id}:`, err);
      logAuditEvent({
        eventType: 'Update Files',
        eventStatus: 'Error',
        userName: session.userName || "Unknown",
        userRole: session.userRole || "Unknown",
        userIdentifier: session.userEmail || "Unknown",
        detailedMessage: `File update failed for task ${id}: ${err.message}`
      });
      return new Response(
          JSON.stringify({ error: "Failed to update attachments" }), // Avoid exposing detailed internal errors
          { status: 500, headers: { "Content-Type": "application/json" } }
      );
  }
}