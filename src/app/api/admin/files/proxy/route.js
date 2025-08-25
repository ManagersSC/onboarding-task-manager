import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import logger from "@/lib/utils/logger"

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const fileUrl = searchParams.get('url')
    
    if (!fileUrl) {
      return new Response(JSON.stringify({ error: "File URL is required" }), { status: 400 })
    }

    // Authentication check
    const cookieStore = await cookies()
    const sealedSession = cookieStore.get("session")?.value
    
    if (!sealedSession) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 })
    }

    const session = await unsealData(sealedSession, {
      password: process.env.SESSION_SECRET,
    })

    if (!session.userRole || session.userRole !== 'admin') {
      return new Response(JSON.stringify({ error: "Not authorized" }), { status: 403 })
    }

    logger.info(`Proxying file download: ${fileUrl}`)

    // Fetch the file from Airtable
    const response = await fetch(fileUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
        'User-Agent': 'Mozilla/5.0 (compatible; Airtable-Proxy/1.0)'
      }
    })

    if (!response.ok) {
      logger.error(`Failed to fetch file from Airtable: ${response.status} ${response.statusText}`)
      return new Response(JSON.stringify({ 
        error: "Failed to fetch file",
        details: response.statusText 
      }), { status: response.status })
    }

    // Get the file content
    const fileBuffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'application/octet-stream'
    const contentLength = response.headers.get('content-length')

    // Return the file with appropriate headers
    return new Response(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': contentLength || fileBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    })

  } catch (error) {
    logger.error("Error in file proxy endpoint:", error)
    return new Response(JSON.stringify({
      error: "Internal server error",
      details: error.message
    }), { status: 500 })
  }
}

export async function OPTIONS(request) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  })
}
