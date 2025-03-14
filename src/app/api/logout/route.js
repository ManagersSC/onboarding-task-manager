// src/app/api/logout/route.js
import { cookies } from "next/headers";
import logger from "@/lib/logger";
import { logAuditEvent } from "@/lib/auditLogger";

export async function POST(request) {
  let cookieStore;
  let userEmail;
  try {
    cookieStore = await cookies();
    userEmail = cookieStore.get("user_email")?.value;
    cookieStore.delete("user_email");

    await logAuditEvent({
      eventType: "Logout",
      eventStatus: "Success",
      userIdentifier: userEmail || "unknown",
      detailedMessage: "Logged out successfully",
      request,
    });

    return Response.json({ message: "Logged out successfully" });
  } catch (error) {
    logger.error("Logout Error:", error);
    logAuditEvent({
      eventType: "Logout",
      eventStatus: "Errror",
      userIdentifier: userEmail,
      detailedMessage: `User logout error: ${error.message}`,
      request,
    });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const logout = POST;
