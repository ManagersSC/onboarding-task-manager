import { cookies } from "next/headers"
import logger from "@/lib/utils/logger"
import Airtable from "airtable"
import bcrypt from "bcryptjs"
import { logAuditEvent } from "@/lib/auditLogger"

export async function POST(request) {
  try {
    // Verify admin role
    const cookieStore = await cookies()
    const role = cookieStore.get("user_role")?.value
    const adminEmail = cookieStore.get("user_email")?.value

    // if (role !== "admin") {
    //   return Response.json({ error: "Unauthorized" }, { status: 401 })
    // }

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
        filterByFormula: `{Email}='${email.trim().toLowerCase()}'`,
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
