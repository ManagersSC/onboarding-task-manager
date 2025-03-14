import { logAuditEvent } from "@/lib/auditLogger"

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }
  try {
    const { eventType, eventStatus, userIdentifier, detailedMessage } = req.body
    await logAuditEvent({
      eventType,
      eventStatus,
      userIdentifier,
      detailedMessage,
      request: req
    })
    return res.status(200).json({ success: true })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
