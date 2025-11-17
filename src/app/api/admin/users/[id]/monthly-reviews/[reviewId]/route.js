import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import logger from "@/lib/utils/logger"
import { logAuditEvent } from "@/lib/auditLogger"

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

export async function DELETE(request, { params }) {
  try {
    const { id, reviewId } = await params
    if (!id || !reviewId) {
      return new Response(JSON.stringify({ error: "Applicant ID and reviewId required" }), { status: 400, headers: { "Content-Type": "application/json" } })
    }

    const cookieStore = await cookies()
    const sealedSession = cookieStore.get("session")?.value
    if (!sealedSession) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { "Content-Type": "application/json" } })
    const session = await unsealData(sealedSession, { password: process.env.SESSION_SECRET })
    if (!session || session.userRole !== "admin") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } })
    }

    // Validate review belongs to applicant and is still scheduled (i.e., no docs)
    const review = await base("Monthly Reviews").find(reviewId)
    const applicantLinks = review.get("Applicant") || []
    if (!applicantLinks.includes(id)) {
      return new Response(JSON.stringify({ error: "Review does not belong to applicant" }), { status: 400, headers: { "Content-Type": "application/json" } })
    }
    const docs = review.get("Docs") || []
    if (Array.isArray(docs) && docs.length > 0) {
      return new Response(JSON.stringify({ error: "Cannot delete a completed review" }), { status: 400, headers: { "Content-Type": "application/json" } })
    }

    const title = review.get("Title") || ""
    const period = review.get("Period") || ""

    await base("Monthly Reviews").destroy(reviewId)

    try {
      await logAuditEvent({
        eventType: "Monthly Review Deleted",
        eventStatus: "Success",
        userName: session.userName,
        userRole: session.userRole,
        userIdentifier: session.userEmail,
        detailedMessage: `Deleted scheduled monthly review (reviewId: ${reviewId}, title: "${title}", period: ${period}) for applicant ${id}`,
        request,
      })
    } catch (e) {
      logger?.error?.("audit log failed for monthly review deletion", e)
    }

    return new Response(JSON.stringify({ success: true, reviewId, applicantId: id }), { status: 200, headers: { "Content-Type": "application/json" } })
  } catch (error) {
    logger?.error?.("monthly review delete failed", error)
    return new Response(JSON.stringify({ error: "Failed to delete monthly review", details: process.env.NODE_ENV === "development" ? error.message : undefined }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
}


