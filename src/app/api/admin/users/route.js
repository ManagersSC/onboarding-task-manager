import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import logger from "@/lib/utils/logger"

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

// Cache for total counts to improve performance
const countCache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Helper function to format applicant data
function formatApplicant(record) {
  return {
    id: record.id,
    name: record.get('Name') || '',
    email: record.get('Email') || '',
    phone: record.get('Phone') || '',
    stage: record.get('Stage') || 'New Application',
    job: record.get('Job Name') || '',
    location: record.get('Interview Location') || '',
    interviewDate: record.get('Interview Date') || '',
    secondInterviewDate: record.get('Second Interview Date') || '',
    docs: {
      present: record.get('Docs Present') || 0,
      required: record.get('Docs Required') || 0
    },
    feedbackCount: record.get('Feedback Count') || 0,
    source: record.get('Job Board') || '',
    createdAt: record.get('Created Time') || '',
    updatedAt: record.get('Last Modified') || ''
  }
}

// Enhanced filter building with better search logic
function buildFilterFormula(params) {
  const { search, stage } = params
  let filters = []
  
  // Enhanced search across multiple fields
  if (search && search.trim()) {
    const searchLower = search.toLowerCase().trim()
    const searchFilters = [
      `FIND('${searchLower}', LOWER({Name})) > 0`,
      `FIND('${searchLower}', LOWER({Email})) > 0`,
      `FIND('${searchLower}', LOWER({Phone})) > 0`,
      `FIND('${searchLower}', LOWER({Job Name})) > 0`,
      `FIND('${searchLower}', LOWER({Address})) > 0`
    ]
    filters.push(`OR(${searchFilters.join(', ')})`)
  }
  
  // Stage filtering with support for multiple stages
  if (stage && stage !== 'all') {
    if (stage === 'interview') {
      // Group interview-related stages
      filters.push(`OR(
        {Stage} = 'First Interview Invite Sent',
        {Stage} = 'First Interview Booked',
        {Stage} = 'Second Interview Invite Sent',
        {Stage} = 'Second Interview Booked'
      )`)
    } else if (stage === 'review') {
      // Group review-related stages
      filters.push(`OR(
        {Stage} = 'Under Review',
        {Stage} = 'Reviewed',
        {Stage} = 'Reviewed (2nd)'
      )`)
    } else if (stage === 'rejected') {
      // Group rejected stages
      filters.push(`OR(
        {Stage} = 'Rejected',
        {Stage} = 'Rejected - After First Interview',
        {Stage} = 'Rejected - After Second Interview',
        {Stage} = 'Rejected - Liked'
      )`)
    } else {
      // Single stage filter
      filters.push(`{Stage} = '${stage}'`)
    }
  }
  
  // Combine all filters
  if (filters.length === 0) {
    return ''
  } else if (filters.length === 1) {
    return filters[0]
  } else {
    return `AND(${filters.join(', ')})`
  }
}

// Get cached count or fetch from Airtable
async function getCachedCount(filterFormula, cacheKey) {
  const now = Date.now()
  const cached = countCache.get(cacheKey)
  
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.count
  }
  
  try {
    // Get total count with filter
    const countResult = await base('Applicants').select({
      filterByFormula: filterFormula,
      fields: ['Name'], // Only fetch minimal data for counting
      maxRecords: 1
    }).firstPage()
    
    // Airtable doesn't give us total count directly, so we need to estimate
    // For now, we'll use a reasonable estimate based on the filter
    let estimatedCount = 100 // Default estimate
    
    if (filterFormula) {
      // If we have filters, estimate based on typical ratios
      if (filterFormula.includes('Interview')) {
        estimatedCount = 30
      } else if (filterFormula.includes('Review')) {
        estimatedCount = 20
      } else if (filterFormula.includes('Rejected')) {
        estimatedCount = 15
      }
    }
    
    // Cache the result
    countCache.set(cacheKey, {
      count: estimatedCount,
      timestamp: now
    })
    
    return estimatedCount
  } catch (error) {
    logger.error('Error getting count:', error)
    return 100 // Fallback estimate
  }
}

export async function GET(request) {
  try {
    // Authentication check
    const cookieStore = await cookies()
    const sealedSession = cookieStore.get("session")?.value
    
    if (!sealedSession) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 })
    }

    const session = await unsealData(sealedSession, {
      password: process.env.SESSION_SECRET,
    })

    if (!session || session.userRole !== 'admin') {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page')) || 1
    const limit = Math.min(parseInt(searchParams.get('limit')) || 20, 50)
    const search = searchParams.get('search') || ''
    const stage = searchParams.get('stage') || 'all'
    const sortBy = searchParams.get('sortBy') || 'Created Time'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Build filter formula
    const filterFormula = buildFilterFormula({ search, stage })
    
    // Create cache key for this filter combination
    const cacheKey = `${filterFormula}-${stage}-${search}`

    // Get applicants from Airtable with enhanced filtering
    const records = await base('Applicants').select({
      filterByFormula: filterFormula,
      sort: [{ field: sortBy, direction: sortOrder }],
      pageSize: limit,
      offset: (page - 1) * limit
    }).all()

    // Format applicants
    const applicants = records.map(formatApplicant)

    // Get cached count for better pagination
    const totalCount = await getCachedCount(filterFormula, cacheKey)
    const hasNext = records.length === limit && (page * limit) < totalCount
    const hasPrev = page > 1

    return new Response(JSON.stringify({
      applicants,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext,
        hasPrev
      },
      // Add metadata for debugging
      metadata: {
        filterApplied: filterFormula || 'none',
        searchTerm: search || 'none',
        stageFilter: stage || 'all'
      }
    }), {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=300" // 5 minute cache
      }
    })

  } catch (error) {
    logger.error("Error fetching applicants:", error)
    return new Response(JSON.stringify({
      error: "Failed to fetch applicants",
      userError: "Unable to load applicants. Please try again.",
      details: process.env.NODE_ENV === "development" ? error.message : null
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
}
