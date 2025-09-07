import { NextResponse } from "next/server"
import Airtable from "airtable"

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

// PUT /api/admin/folders/[id] - Update folder
export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const { name, is_inActive } = await request.json()

    const fieldsToUpdate = {}
    
    if (name !== undefined) {
      if (!name || name.trim() === "") {
        return NextResponse.json(
          { error: "Folder name is required" },
          { status: 400 }
        )
      }
      fieldsToUpdate.Name = name.trim()
    }

    if (is_inActive !== undefined) {
      fieldsToUpdate.is_inActive = is_inActive
    }

    if (Object.keys(fieldsToUpdate).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      )
    }

    // Check if folder exists
    const folder = await base("Onboarding Folders").find(id)
    if (!folder) {
      return NextResponse.json(
        { error: "Folder not found" },
        { status: 404 }
      )
    }

    // If updating name, check for duplicates
    if (name !== undefined) {
      const existingFolders = []
      await base("Onboarding Folders")
        .select({
          filterByFormula: `AND({Name} = "${name.trim()}", NOT({is_inActive}), RECORD_ID() != "${id}")`
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
    }

    // Update folder
    const updatedFolder = await base("Onboarding Folders").update([
      {
        id: id,
        fields: fieldsToUpdate
      }
    ])

    const folderData = updatedFolder[0]
    return NextResponse.json({
      id: folderData.id,
      name: folderData.get("Name"),
      is_system: folderData.get("is_system"),
      is_inActive: folderData.get("is_inActive"),
      usage_count: folderData.get("usage_count") || 0,
      created_at: folderData.get("Created At")
    })
  } catch (error) {
    console.error("Error updating folder:", error)
    return NextResponse.json(
      { error: "Failed to update folder" },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/folders/[id] - Soft delete folder
export async function DELETE(request, { params }) {
  try {
    const { id } = await params

    // Check if folder exists
    const folder = await base("Onboarding Folders").find(id)
    if (!folder) {
      return NextResponse.json(
        { error: "Folder not found" },
        { status: 404 }
      )
    }

    // Check if folder is in use
    const usageCount = folder.get("usage_count") || 0
    if (usageCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete folder that is currently in use" },
        { status: 409 }
      )
    }

    // Soft delete (set is_inActive = true)
    const updatedFolder = await base("Onboarding Folders").update([
      {
        id: id,
        fields: {
          is_inActive: true
        }
      }
    ])

    return NextResponse.json({
      success: true,
      message: "Folder deleted successfully"
    })
  } catch (error) {
    console.error("Error deleting folder:", error)
    return NextResponse.json(
      { error: "Failed to delete folder" },
      { status: 500 }
    )
  }
}
