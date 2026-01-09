import { NextResponse } from "next/server"
import Airtable from "airtable"

// GET /api/admin/jobs - Fetch all open jobs
export async function GET(request) {
  try {
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      return NextResponse.json(
        { error: "Server configuration error. Missing Airtable credentials." },
        { status: 500 }
      )
    }
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)
    const { searchParams } = new URL(request.url)
    const includeClosed = searchParams.get('includeClosed') === 'true'

    let filterFormula = "{Job Status} = 'Open'"
    if (includeClosed) {
      filterFormula = "TRUE()"
    }

    const jobs = []
    await base("Jobs")
      .select({
        filterByFormula: filterFormula,
        sort: [{ field: "Title", direction: "asc" }]
      })
      .eachPage((records, fetchNextPage) => {
        records.forEach(record => {
          jobs.push({
            id: record.id,
            title: record.get("Title") || "",
            description: record.get("Description") || "",
            jobStatus: record.get("Job Status") || "",
            requiredExperience: record.get("Required Experience") || "",
            createdTime: record.get("Created Time") || null
          })
        })
        fetchNextPage()
      })

    return NextResponse.json({ jobs })
  } catch (error) {
    console.error("Error fetching jobs:", error)
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    )
  }
}
