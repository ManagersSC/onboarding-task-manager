import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import logger from "@/lib/utils/logger"
import Airtable from "airtable"
import bcrypt from "bcryptjs"
import { logAuditEvent } from "@/lib/auditLogger"
import { escapeAirtableValue } from "@/lib/airtable/sanitize"

export async function POST(request) {
  try {
    // Verify admin role using iron-session
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("session")?.value
    if (!sessionCookie) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    let session
    try {
      session = await unsealData(sessionCookie, {
        password: process.env.SESSION_SECRET,
        ttl: 60 * 60 * 8,
      })
    } catch {
      return Response.json({ error: "Invalid session" }, { status: 401 })
    }

    if (session.userRole !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    const adminEmail = session.userEmail

    const { name, email, password, isAdmin } = await request.json()

    if (!name || !email || !password) {
      return Response.json({ error: "Name, email and password are required" }, { status: 400 })
    }

    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      logger.error("Server configuration error: Missing Airtable credentials")
      return Response.json({ error: "Server configuration error" }, { status: 500 })
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

    // Check if user already exists
    const existingUsers = await base("Staff")
      .select({
        filterByFormula: `{Email}='${escapeAirtableValue(email.trim().toLowerCase())}'`,
        maxRecords: 1,
      })
      .firstPage()

    if (existingUsers.length > 0) {
      return Response.json({ error: "User with this email already exists" }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create new admin user
    const newUser = await base("Staff").create([
      {
        fields: {
          Name: name,
          Email: email.trim().toLowerCase(),
          Password: hashedPassword,
          IsAdmin: isAdmin,
        },
      },
    ])

    // Log the event
    await logAuditEvent({
      eventType: "User",
      eventStatus: "Success",
      userIdentifier: adminEmail,
      detailedMessage: `Admin user created: ${email}`,
      request,
    })

    return Response.json({
      message: "Admin user created successfully",
      userId: newUser[0].id,
    })
  } catch (error) {
    logger.error("Error creating admin user:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
