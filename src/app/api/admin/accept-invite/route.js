import Airtable from "airtable"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import logger from "@/lib/utils/logger"
import { logAuditEvent } from "@/lib/auditLogger"
import { cookies } from "next/headers"
import { sealData } from "iron-session"

export async function POST(request) {
  try {
    const { token, password, confirmPassword } = await request.json()
    if (!token || !password || !confirmPassword) {
      return Response.json({ error: "Invalid request" }, { status: 400 })
    }
    if (password !== confirmPassword) {
      return Response.json({ error: "Passwords do not match" }, { status: 400 })
    }
    // Stronger validation: min 8, one special char, and disallow obvious consecutive sequences
    const hasSpecial = /[^A-Za-z0-9]/.test(password)
    if (password.length < 8 || !hasSpecial) {
      return Response.json({ error: "Password must be 8+ chars and include a special character" }, { status: 400 })
    }
    // Disallow common ascending sequences like 123, 234, 345, 456, 567, 678, 789, 012
    const forbiddenSequences = ["012", "123", "234", "345", "456", "567", "678", "789"]
    for (const seq of forbiddenSequences) {
      if (password.includes(seq)) {
        return Response.json({ error: "Password cannot contain consecutive number sequences" }, { status: 400 })
      }
    }

    if (!process.env.JWT_SECRET) {
      logger.error("JWT_SECRET not configured")
      return Response.json({ error: "Server configuration error" }, { status: 500 })
    }
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      logger.error("Missing Airtable env vars")
      return Response.json({ error: "Server configuration error" }, { status: 500 })
    }

    let payload
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET)
    } catch (err) {
      return Response.json({ error: "Invalid or expired token" }, { status: 400 })
    }

    const { staffId, email, type, nonce } = payload || {}
    if (!staffId || !email || type !== "admin_invite") {
      return Response.json({ error: "Invalid token payload" }, { status: 400 })
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)
    const rec = await base("Staff").find(staffId)
    if (!rec || (rec.fields?.Email || "").toLowerCase() !== String(email).toLowerCase()) {
      return Response.json({ error: "Invite not valid for this user" }, { status: 400 })
    }

    if (rec.fields?.Password) {
      return Response.json({ error: "Invite already used" }, { status: 400 })
    }

    // VULN-H7: Verify invite nonce (single-use token)
    const storedNonce = rec.fields?.["Invite Nonce"]
    if (!nonce || !storedNonce || nonce !== storedNonce) {
      return Response.json({ error: "This invite link has already been used or is invalid" }, { status: 400 })
    }

    const hashed = await bcrypt.hash(password, 10)
    await base("Staff").update([
      {
        id: staffId,
        fields: {
          Password: hashed,
          IsAdmin: true,
          "Invite Nonce": "", // Clear nonce on use
        },
      },
    ])

    // Auto-login: set session cookie like admin login route
    try {
      const cookieStore = await cookies()
      const sessionData = {
        userEmail: (rec.fields?.Email || email).toLowerCase(),
        userRole: "admin",
        userName: rec.fields?.Name || "Admin",
        userStaffId: rec.id,
      }
      const sealedSession = await sealData(sessionData, {
        password: process.env.SESSION_SECRET,
        ttl: 60 * 60 * 8,
      })
      cookieStore.set("session", sealedSession, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 8,
      })
    } catch (e) {
      logger.error("Failed to set session cookie after invite accept:", e)
    }

    try {
      await logAuditEvent({
        eventType: "User",
        eventStatus: "Success",
        userRole: "Admin",
        userIdentifier: email,
        detailedMessage: `Admin accepted invite (${staffId})`,
        request,
      })
    } catch {}

    return Response.json({ message: "Password set. You are now logged in.", redirect: "/admin/dashboard" })
  } catch (error) {
    logger.error("accept-invite error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}



