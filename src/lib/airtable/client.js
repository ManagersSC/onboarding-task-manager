import Airtable from "airtable"

let cachedBase = null

export function getAirtableBase() {
  if (cachedBase) return cachedBase
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    throw new Error("Airtable environment variables are missing")
  }
  cachedBase = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)
  return cachedBase
}


