// src/app/api/logout/route.js
import { cookies } from "next/headers";
import logger from "@/lib/logger";
import { logAuditEvent } from "@/lib/auditLogger";

export async function logout(request) {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("user_email");
    return Response.json({ message: "Logged out successfully" });
  } catch (error) {
    const userEmail = cookieStore.get("user_email");
    logger.error("Logout Error:", error);
    logAuditEvent({
      eventType: "Logout",
      eventStatus: "Errror",
      userIdentifier: userEmail,
      detailedMessage: `Fetching user detail failed, error message: ${error.message}`,
      request
    });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
