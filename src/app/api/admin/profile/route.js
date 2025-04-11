import { cookies } from "next/headers"
import logger from "@/lib/logger"
import Airtable from "airtable"
import { unsealData, sealData } from "iron-session"
import { logAuditEvent } from "@/lib/auditLogger"

export async function GET(request) {
  let userEmail;
  let userRole;
  try {
    // Verify admin role
    const sessionCookie = (await cookies()).get('session')?.value;
    if(!sessionCookie){
      logger.debug("no sessionCookie");
      return Response.json(
        { error: "Unauthorised"},
        { status: 401 }
      )
    }
    let session;
    try {
      session = await unsealData(sessionCookie, {
        password: process.env.SESSION_SECRET,
        ttl: 60 * 60 * 8, // Match login ttl
      });
    } catch (error) {
      logger.debug(`Invalid session: ${error.message}`)
      return Response.json({ 
        error: "invalid Session",
        details: process.env.NODE_ENV === "development" ? error.message : null
      }, { status: 401 });
    }
    if(!session.userEmail){
      logger.debug(`Invalid session format`)
      return Response.json(
        { error: "Invalid session format" },
        { status: 401 }
      );
    }

    // Extract Session data
    userEmail = session.userEmail;
    userRole = session.userRole;
    logger.debug(`(PROFILE API) Session cookie: \nEmail: ${userEmail} \nRole: ${userRole}`)
    
    // Check for admin privileges correctly
    if (userRole !== "admin") {
      logger.debug(`role: ${userRole}`)
      return Response.json({ error: "Insufficient privileges" }, { status: 403 });
    }

    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      logger.error("Server configuration error: Missing Airtable credentials")
      return Response.json({ error: "Server configuration error" }, { status: 500 })
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

    const escapedEmail = userEmail.replace(/'/g, "''");
    const email = escapedEmail;

    // Get admin profile from Staff table
    const staffResponse = await base("Staff")
      .select({
        filterByFormula: `{Email}='${email}'`,
        maxRecords: 1,
        fields: ["Name", "Email"],
      })
    .firstPage()

    if (staffResponse.length === 0) {
      return Response.json({
        name: email.split("@")[0],
        email,
        role: "Admin",
      })
    }

    // Renew Session
    const renewedSession = { userEmail: email, userRole: userRole };
    const renewedSealed = await sealData(renewedSession, {
      password: process.env.SESSION_SECRET,
      ttl: 60 * 60,
    });

    const cookieStore = await cookies();
  
    cookieStore.set('session', renewedSealed, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8,
    });

    const adminUser = staffResponse[0]

    return Response.json({
      name: adminUser.fields.Name || email.split("@")[0],
      email: adminUser.fields.Email || email,
      role: "Admin",
    })
  } catch (error) {
    logger.error("Error fetching admin profile:", error)
    logAuditEvent({
      eventType: "Login",
      eventStatus: "Error",
      userRole: userRole || "Unknown",
      userIdentifier: userEmail,
      detailedMessage: `Admin login failed, error message: ${error.message}`,
      request,
    })
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
