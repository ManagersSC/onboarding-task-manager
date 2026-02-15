import { NextResponse } from 'next/server'
import Airtable from 'airtable'

export const runtime = 'nodejs'

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

export async function GET(request, { params }) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Applicant ID is required' }, { status: 400 })
    }

    // Fetch the applicant to get their email
    let applicant
    try {
      applicant = await base('Applicants').find(id)
    } catch {
      return NextResponse.json({ error: 'Applicant not found' }, { status: 404 })
    }

    const email = applicant.get('Email')
    if (!email) {
      return NextResponse.json({ tasks: [], hasMore: false })
    }

    // Fetch task logs for this applicant
    const taskLogs = await base('Onboarding Tasks Logs')
      .select({
        filterByFormula: `AND(FIND("${String(email).replace(/"/g, '\\"')}", ARRAYJOIN({Assigned})), Status != "Completed")`,
        fields: ['Display Title', 'Status', 'Task Week Number', 'Urgency', 'Display Type', 'Folder Name'],
        sort: [
          { field: 'Urgency', direction: 'desc' },
          { field: 'Task Week Number', direction: 'asc' },
        ],
        pageSize: 6, // Fetch 6 to know if there are more than 5
      })
      .firstPage()

    const tasks = taskLogs.slice(0, 5).map((log) => ({
      id: log.id,
      title: log.get('Display Title') || 'Untitled Task',
      status: log.get('Status') || 'Assigned',
      weekNumber: log.get('Task Week Number') || null,
      urgency: log.get('Urgency') || null,
      type: log.get('Display Type') || 'Task',
      folder: log.get('Folder Name') || null,
    }))

    return NextResponse.json({
      tasks,
      hasMore: taskLogs.length > 5,
    })
  } catch (error) {
    console.error('Error fetching tasks for new hire:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tasks', details: error.message },
      { status: 500 }
    )
  }
}
