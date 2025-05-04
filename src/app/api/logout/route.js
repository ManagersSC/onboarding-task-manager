// src/app/api/logout/route.js
import { cookies } from "next/headers";
import logger from "@/lib/utils/logger";
import { logAuditEvent } from "@/lib/auditLogger";
import { unsealData } from "iron-session";

export async function POST(request) {
  let cookieStore;
  let userEmail;
  let userRole;
  let userName;
  try {
    cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session")?.value;

    if (!sessionCookie) {
      logger.debug(`No session cookie`)
      return Response.json({ error: "No active session" }, { status: 400 });
    }

    // Unseal the session cookie using your session secret and TTL
    const session = await unsealData(sessionCookie, {
      password: process.env.SESSION_SECRET,
      ttl: 60 * 60 * 8, // Adjust TTL as necessary
    });
    userEmail = session.userEmail;
    userRole = session.userRole;
    userName = session.userName;

    // Clear the session cookie so that user data is removed
    cookieStore.delete("session");

    logger.debug(`Logged out: ${userEmail}, ${userRole}, ${userName}`)
    // logger.debug(`Logged out: ${session.userEmail}, ${session.userName}, ${session.userRole}`)

    await logAuditEvent({
      eventType: "Logout",
      eventStatus: "Success",
      userIdentifier: userEmail || "unknown",
      userName,
      userRole,
      detailedMessage: "Logged out successfully",
      request,
    });

    return Response.json({ message: "Logged out successfully" });
  } catch (error) {
    logger.error("Logout Error:", error);
    logAuditEvent({
      eventType: "Logout",
      eventStatus: "Error",
      userIdentifier: userEmail,
      detailedMessage: `User logout error: ${error.message}`,
      request,
    });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const logout = POST;
