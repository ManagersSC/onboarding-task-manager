import { NextResponse } from "next/server"
import Airtable from "airtable"

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

// GET /api/admin/folders - Fetch all active folders
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'

    let filterFormula = "NOT({is_inActive})"
    if (includeInactive) {
      filterFormula = "TRUE()"
    }

    const folders = []
    await base("Onboarding Folders")
      .select({
        filterByFormula: filterFormula,
        sort: [{ field: "Name", direction: "asc" }]
      })
      .eachPage((records, fetchNextPage) => {
        records.forEach(record => {
          folders.push({
            id: record.id,
            name: record.get("Name") || "",
            is_system: record.get("is_system") || false,
            is_inActive: record.get("is_inActive") || false,
            usage_count: record.get("usage_count") || 0,
            created_at: record.get("Created At") || null
          })
        })
        fetchNextPage()
      })

    return NextResponse.json({ folders })
  } catch (error) {
    console.error("Error fetching folders:", error)
    return NextResponse.json(
      { error: "Failed to fetch folders" },
      { status: 500 }
    )
  }
}

// POST /api/admin/folders - Create new folder
export async function POST(request) {
  try {
    const { name, is_system = false } = await request.json()

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "Folder name is required" },
        { status: 400 }
      )
    }

    // Check if folder already exists
    const existingFolders = []
    await base("Onboarding Folders")
      .select({
        filterByFormula: `AND({Name} = "${name}", NOT({is_inActive}))`
      })
      .eachPage((records, fetchNextPage) => {
        records.forEach(record => existingFolders.push(record))
        fetchNextPage()
      })

    if (existingFolders.length > 0) {
      return NextResponse.json(
        { error: "Folder with this name already exists" },
        { status: 409 }
      )
    }

    // Create new folder
    const newFolder = await base("Onboarding Folders").create([
      {
        fields: {
          Name: name.trim(),
          is_system: is_system,
          is_inActive: false
        }
      }
    ])

    const folder = newFolder[0]
    return NextResponse.json({
      id: folder.id,
      name: folder.get("Name"),
      is_system: folder.get("is_system"),
      is_inActive: folder.get("is_inActive"),
      usage_count: folder.get("usage_count") || 0,
      created_at: folder.get("Created At")
    })
  } catch (error) {
    console.error("Error creating folder:", error)
    return NextResponse.json(
      { error: "Failed to create folder" },
      { status: 500 }
    )
  }
}
