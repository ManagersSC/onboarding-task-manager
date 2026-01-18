import { NextResponse } from 'next/server'
import Airtable from 'airtable'
import { replaceVariables } from '@/lib/utils/email-variables'

export const runtime = 'nodejs'

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

// Minimal concurrency limiter (avoid hammering Airtable with 25 parallel queries)
function pLimit(concurrency = 4) {
  let activeCount = 0
  const queue = []
  const next = () => {
    if (queue.length === 0 || activeCount >= concurrency) return
    const { fn, resolve, reject } = queue.shift()
    activeCount++
    Promise.resolve()
      .then(fn)
      .then((val) => {
        activeCount--
        resolve(val)
        next()
      })
      .catch((err) => {
        activeCount--
        reject(err)
        next()
      })
  }
  return (fn) =>
    new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject })
      next()
    })
}

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

    const limiter = pLimit(4)

    const newHires = await Promise.all(records.map((record) => limiter(async () => {
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

      const email = record.get('Email') || ''
      const tasks = await getTaskStats(email)
      const progress = calculateProgressFromTasks(tasks)

      const applicantData = {
        id: record.id,
        name: record.get('Name'),
        email,
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
        progress,
        tasks,
        avatar: null
      }

      return applicantData
    })))

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

function calculateProgressFromTasks(tasks) {
  const completed = Number(tasks?.completed || 0)
  const total = Number(tasks?.total || 0)
  return total > 0 ? Math.round((completed / total) * 100) : 0
}

// Get task completion statistics
async function getTaskStats(applicantEmail) {
  if (!applicantEmail) {
    return { completed: 0, total: 0 }
  }

  // Old logic (restored): progress derived from Airtable "Onboarding Tasks Logs"
  // - Filter records where applicantEmail is contained in {Assigned}
  // - Count Status === "Completed"
  try {
    const taskLogs = await base("Onboarding Tasks Logs")
      .select({
        filterByFormula: `FIND("${String(applicantEmail).replace(/"/g, '\\"')}", ARRAYJOIN({Assigned}))`,
        fields: ["Status", "Task"],
        pageSize: 100,
      })
      .all()

    const completed = taskLogs.filter((log) => log?.fields?.Status === "Completed").length
    const total = taskLogs.length
    return { completed, total }
  } catch (err) {
    console.error("Error fetching Onboarding Tasks Logs for", applicantEmail, err)
    return { completed: 0, total: 0 }
  }
}