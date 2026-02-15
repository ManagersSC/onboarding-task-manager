import path from "path"
import { promises as fs } from "fs"
import logger from "@/lib/utils/logger"

export async function GET() {
  try {
    const schemaPath = path.join(process.cwd(), "docs", "ATS_schema.json")
    const raw = await fs.readFile(schemaPath, "utf8")
    const json = JSON.parse(raw)
    const tables = Array.isArray(json?.tables) ? json.tables : []

    const findTable = (name) => tables.find((t) => String(t?.name) === name)
    const pickAttachmentFields = (table) =>
      Array.isArray(table?.fields)
        ? table.fields
            .filter((f) => f?.type === "multipleAttachments")
            .map((f) => ({ fieldName: f.name, label: f.name }))
        : []

    const applicants = findTable("Applicants")
    const documents = findTable("Documents")

    const core = pickAttachmentFields(applicants) // Applicants → Core
    const docs = pickAttachmentFields(documents) // Documents

    return new Response(
      JSON.stringify({
        core,
        documents: docs,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  } catch (e) {
    logger?.error?.("Failed to read ATS_schema for attachment fields", e)
    return new Response(JSON.stringify({ error: "Failed to load attachment fields" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}


