import logger from "@/lib/utils/logger"

const AIRTABLE_META_URL = `https://api.airtable.com/v0/meta/bases/${process.env.AIRTABLE_BASE_ID}/tables`

export async function GET() {
  try {
    const resp = await fetch(AIRTABLE_META_URL, {
      headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` },
    })
    if (!resp.ok) {
      const text = await resp.text()
      throw new Error(`Airtable Meta API ${resp.status}: ${text}`)
    }

    const { tables } = await resp.json()
    const findTable = (name) => tables?.find((t) => t?.name === name)

    const pickAttachmentFields = (table) =>
      Array.isArray(table?.fields)
        ? table.fields
            .filter((f) => f?.type === "multipleAttachments")
            .map((f) => ({ fieldId: f.id, label: f.name }))
        : []

    const core = pickAttachmentFields(findTable("Applicants"))
    const docs = pickAttachmentFields(findTable("Documents"))

    return Response.json({ core, documents: docs })
  } catch (e) {
    logger?.error?.("Failed to fetch attachment fields from Airtable Meta API", e)
    return Response.json({ error: "Failed to load attachment fields" }, { status: 500 })
  }
}
