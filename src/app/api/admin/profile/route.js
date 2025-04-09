import { cookies } from "next/headers"
import logger from "@/lib/logger"
import Airtable from "airtable"
import { logAuditEvent } from "@/lib/auditLogger"

export async function GET(request) {
  try {
    // Verify admin role
    const cookieStore = await cookies()
    const role = cookieStore.get("user_role")?.value
    const email = cookieStore.get("user_email")?.value

    // if (role !== "admin" || !email) {
    //   return Response.json({ error: "Unauthorized" }, { status: 401 })
    // }

    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      logger.error("Server configuration error: Missing Airtable credentials")
      return Response.json({ error: "Server configuration error" }, { status: 500 })
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

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

    const adminUser = staffResponse[0]

    return Response.json({
      name: adminUser.fields.Name || email.split("@")[0],
      email: adminUser.fields.Email || email,
      role: "Admin",
    })
  } catch (error) {
    logger.error("Error fetching admin profile:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
