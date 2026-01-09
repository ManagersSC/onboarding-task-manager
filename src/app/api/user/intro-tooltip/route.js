import Airtable from "airtable"
import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import logger from "@/lib/utils/logger"

const APPLICANTS = "Applicants"
const FIELD_NAME = "Introduction Tooltip " // note the trailing space in schema

async function getSession() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("session")?.value
  if (!sessionCookie) return null
  try {
    const session = await unsealData(sessionCookie, {
      password: process.env.SESSION_SECRET,
      ttl: 60 * 60 * 8,
    })
    return session
  } catch (err) {
    logger.debug(`Invalid session in intro-tooltip: ${err.message}`)
    return null
  }
}

function ensureAirtable() {
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    throw new Error("Airtable env missing")
  }
  return new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.userEmail) {
      return Response.json({ error: "Unauthorised" }, { status: 401 })
    }
    const base = ensureAirtable()
    const escapedEmail = session.userEmail.replace(/'/g, "''")
    const recs = await base(APPLICANTS)
      .select({ filterByFormula: `{Email}='${escapedEmail}'`, maxRecords: 1, fields: ["Email", FIELD_NAME] })
      .firstPage()
    if (!recs?.length) {
      return Response.json({ error: "Applicant not found" }, { status: 404 })
    }
    const flag = Boolean(recs[0].fields[FIELD_NAME])
    // introTooltip true means tour already completed
    return Response.json({ introTooltip: flag })
  } catch (e) {
    logger.error("GET intro-tooltip failed:", e)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const session = await getSession()
    if (!session?.userEmail) {
      return Response.json({ error: "Unauthorised" }, { status: 401 })
    }
    let body = {}
    try {
      body = await request.json()
    } catch {}
    const nextVal = Boolean(body?.introTooltip)
    const base = ensureAirtable()
    const escapedEmail = session.userEmail.replace(/'/g, "''")
    const recs = await base(APPLICANTS)
      .select({ filterByFormula: `{Email}='${escapedEmail}'`, maxRecords: 1, fields: ["Email"] })
      .firstPage()
    if (!recs?.length) {
      return Response.json({ error: "Applicant not found" }, { status: 404 })
    }
    await base(APPLICANTS).update([
      {
        id: recs[0].id,
        fields: { [FIELD_NAME]: nextVal },
      },
    ])
    return Response.json({ success: true })
  } catch (e) {
    logger.error("PUT intro-tooltip failed:", e)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}


