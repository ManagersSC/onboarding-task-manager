import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { unsealData } from 'iron-session'
import Airtable from 'airtable'
import logger from '@/lib/utils/logger'

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

// PUT - Update email template
export async function PUT(request, { params }) {
  try {
    // Session validation
    const sessionCookie = (await cookies()).get("session")?.value
    if (!sessionCookie) {
      logger.debug("API PUT EMAIL-TEMPLATES: No sessionCookie")
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

    const p = await params
    const { id } = p
    const { name, subject, body } = await request.json()

    // Validation
    if (!name?.trim() || !subject?.trim() || !body?.trim()) {
      return NextResponse.json(
        { error: 'Name, subject, and body are required' },
        { status: 400 }
      )
    }

    // Check if template exists and is custom
    const existingRecord = await base('Email Templates').find(id)
    if (!existingRecord.get('isCustom')) {
      return NextResponse.json(
        { error: 'Cannot modify built-in templates' },
        { status: 403 }
      )
    }

    const record = await base('Email Templates').update([
      {
        id,
        fields: {
          Name: name.trim(),
          Subject: subject.trim(),
          Body: body.trim(),
          'Updated At': new Date().toISOString()
        }
      }
    ])

    const template = {
      id: record[0].id,
      name: record[0].get('Name'),
      subject: record[0].get('Subject'),
      body: record[0].get('Body'),
      isCustom: record[0].get('isCustom'),
      updatedAt: record[0].get('Updated At')
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Error updating email template:', error)
    return NextResponse.json(
      { error: 'Failed to update email template' },
      { status: 500 }
    )
  }
}

// DELETE - Delete email template
export async function DELETE(request, { params }) {
  try {
    // Session validation
    const sessionCookie = (await cookies()).get("session")?.value
    if (!sessionCookie) {
      logger.debug("API DELETE EMAIL-TEMPLATES: No sessionCookie")
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

    const { id } = await params

    // Check if template exists and is custom
    const existingRecord = await base('Email Templates').find(id)
    if (!existingRecord.get('isCustom')) {
      return NextResponse.json(
        { error: 'Cannot delete built-in templates' },
        { status: 403 }
      )
    }

    await base('Email Templates').destroy(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting email template:', error)
    return NextResponse.json(
      { error: 'Failed to delete email template' },
      { status: 500 }
    )
  }
} 