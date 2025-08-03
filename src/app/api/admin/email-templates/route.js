import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { unsealData } from 'iron-session'
import Airtable from 'airtable'
import logger from '@/lib/utils/logger'

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

// GET - Fetch all email templates
export async function GET() {
  try {
    const records = await base('Email Templates').select({
      sort: [{ field: 'Created At', direction: 'desc' }]
    }).all()

    const templates = records.map(record => ({
      id: record.id,
      name: record.get('Name'),
      subject: record.get('Subject'),
      body: record.get('Body'),
      isCustom: record.get('isCustom'),
      createdBy: record.get('Created By'),
      createdAt: record.get('Created At'),
      updatedAt: record.get('Updated At')
    }))

    return NextResponse.json({ templates })
  } catch (error) {
    console.error('Error fetching email templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch email templates' },
      { status: 500 }
    )
  }
}

// POST - Create new email template
export async function POST(request) {
  try {
    // Session validation
    const sessionCookie = (await cookies()).get("session")?.value
    if (!sessionCookie) {
      logger.debug("API POST EMAIL-TEMPLATES: No sessionCookie")
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
    }

    let session
    try {
      session = await unsealData(sessionCookie, {
        password: process.env.SESSION_SECRET,
        ttl: 60 * 60 * 8,
      })
    } catch (error) {
      logger.debug(`Invalid session: ${error.message}`)
      return NextResponse.json(
        {
          error: "Invalid Session",
          details: process.env.NODE_ENV === "development" ? error.message : null,
        },
        { status: 401 },
      )
    }

    if (!session.userEmail) {
      logger.debug(`Invalid session format`)
      return NextResponse.json({ error: "Invalid session format" }, { status: 401 })
    }

    // Check if user is admin
    if (session.userRole !== "admin") {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
    }

    const { name, subject, body } = await request.json()

    // Validation
    if (!name?.trim() || !subject?.trim() || !body?.trim()) {
      return NextResponse.json(
        { error: 'Name, subject, and body are required' },
        { status: 400 }
      )
    }

    const record = await base('Email Templates').create([
      {
        fields: {
          Name: name.trim(),
          Subject: subject.trim(),
          Body: body.trim(),
          isCustom: true,
          'Created By': [session.userStaffId] // Use actual user ID from session
        }
      }
    ])

    const template = {
      id: record[0].id,
      name: record[0].get('Name'),
      subject: record[0].get('Subject'),
      body: record[0].get('Body'),
      isCustom: record[0].get('isCustom'),
      createdBy: record[0].get('Created By'),
      createdAt: record[0].get('Created At')
    }

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    console.error('Error creating email template:', error)
    return NextResponse.json(
      { error: 'Failed to create email template' },
      { status: 500 }
    )
  }
} 