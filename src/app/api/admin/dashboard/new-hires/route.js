import { NextResponse } from 'next/server'
import Airtable from 'airtable'
import { replaceVariables } from '@/lib/utils/email-variables'

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

export async function GET() {
  try {
    // Fetch applicants with "Hired" stage and expand linked records
    const records = await base('Applicants').select({
      filterByFormula: "{Stage} = 'Hired'",
      sort: [{ field: 'Onboarding Start Date', direction: 'desc' }]
    }).all()

    console.log('Fetched records:', records.length)

    const newHires = records.map(record => {
      // Use the "Job Name" field directly instead of linked records
      const jobRole = record.get('Job Name') || 'Role TBD'
      const location = record.get('Location') || record.fields?.fldITAJcvyysx3Gxr
      
      console.log('Job Name field:', record.get('Job Name'))
      console.log('Location field:', record.get('Location'))
      
      console.log('Record data:', {
        id: record.id,
        name: record.get('Name'),
        jobRole: jobRole,
        location: location,
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
        progress: calculateProgress(record),
        tasks: getTaskStats(record),
        avatar: record.get('Profile Photo')?.[0]?.url
      }

      return applicantData
    })

    console.log('Processed new hires:', newHires.length)
    return NextResponse.json({ newHires })
  } catch (error) {
    console.error('Error fetching new hires:', error)
    return NextResponse.json(
      { error: 'Failed to fetch new hire data' },
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