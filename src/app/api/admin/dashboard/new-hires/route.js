import { NextResponse } from 'next/server'
import Airtable from 'airtable'
import { replaceVariables } from '@/lib/utils/email-variables'

export const runtime = 'nodejs'

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

// Simple TTL cache for 60s
let cacheData = null
let cacheTime = 0
const CACHE_TTL = 60 * 1000

export async function GET() {
  try {
    const now = Date.now()
    if (cacheData && now - cacheTime < CACHE_TTL) {
      return NextResponse.json(cacheData)
    }

    // Fetch applicants with "Hired" stage, minimal fields, limited page
    const fields = [
      'Name',
      'Email',
      'Job Name',
      'Onboarding Location',
      'Onboarding Start Date',
      'Onboarding Started',
      'Onboarding Status',
      'Onboarding Paused',
      'Onboarding Paused At',
      'Onboarding Paused Reason',
      'Onboarding Resumed At',
      'Onboarding Resumed On'
    ]
    let records = []
    try {
      records = await base('Applicants').select({
        filterByFormula: "{Stage} = 'Hired'",
        sort: [{ field: 'Onboarding Start Date', direction: 'desc' }],
        fields,
        pageSize: 25
      }).firstPage()
    } catch (airtableErr) {
      return NextResponse.json(
        { error: 'Airtable error fetching new hires', details: airtableErr.message },
        { status: 502 }
      )
    }

    console.log('Fetched records:', records.length)

    const newHires = records.map(record => {
      // Use the "Job Name" field directly instead of linked records
      const rawJobName = record.get('Job Name')
      const jobRole = Array.isArray(rawJobName) ? (rawJobName[0] || 'Role TBD') : (rawJobName || 'Role TBD')
      const location = record.get('Onboarding Location') || null
      
      console.log('Job Name field:', record.get('Job Name'))
      console.log('Onboarding Location field:', record.get('Onboarding Location'))
      
      console.log('Record data:', {
        id: record.id,
        name: record.get('Name'),
        jobRole: jobRole,
        location,
        allFields: Object.keys(record.fields)
      })
      
      const role = jobRole || 'Role TBD'
      
      // Use the job role as the department as well, since there's no separate department field
      const department = jobRole || 'Department TBD'

      const applicantData = {
        id: record.id,
        name: record.get('Name'),
        email: record.get('Email'),
        role: role,
        department: department,
        onboardingStartDate: record.get('Onboarding Start Date'),
        onboardingStarted: record.get('Onboarding Started'),
        onboardingStatus: record.get('Onboarding Status'),
        // Pause/Resume fields
        onboardingPaused: record.get('Onboarding Paused') || false,
        onboardingPausedAt: record.get('Onboarding Paused At') || null,
        onboardingPausedReason: record.get('Onboarding Paused Reason') || null,
        onboardingResumedAt: record.get('Onboarding Resumed At') || null,
        onboardingResumedOn: record.get('Onboarding Resumed On') || null,
        progress: calculateProgress(record),
        tasks: getTaskStats(record),
        avatar: null
      }

      return applicantData
    })

    console.log('Processed new hires:', newHires.length)
    const response = { newHires }
    cacheData = response
    cacheTime = now
    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching new hires:', error)
    return NextResponse.json(
      { error: 'Failed to fetch new hire data', details: error.message },
      { status: 500 }
    )
  }
}

// Calculate onboarding progress based on completed tasks
function calculateProgress(record) {
  const onboardingStatus = record.get('Onboarding Status')
  const statusProgress = {
    'Docs Pending': 10,
    'Docs Signed': 25,
    'Week 1 Quiz ✅': 40,
    'Week 2 Quiz ✅': 55,
    'Week 3 Quiz ✅': 70,
    'Week 4 Quiz ✅': 85
  }

  return statusProgress[onboardingStatus] || 0
}

// Get task completion statistics
function getTaskStats(record) {
  // This would need to be implemented based on your task tracking system
  // For now, returning placeholder data
  return {
    completed: 0,
    total: 0
  }
} 