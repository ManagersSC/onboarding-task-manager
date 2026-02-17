import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import logger from "@/lib/utils/logger"

export async function POST(request) {
  try {
    // Authentication check
    const cookieStore = await cookies()
    const sealedSession = cookieStore.get("session")?.value
    
    logger.info("Add applicants API called", {
      hasSession: !!sealedSession,
      sessionLength: sealedSession?.length || 0,
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer'),
      allCookies: Array.from(cookieStore.getAll()).map(c => c.name)
    })
    
    if (!sealedSession) {
      logger.warn("No session cookie found in add-applicants API")
      return new Response(JSON.stringify({ 
        error: "Not authenticated", 
        details: "No session cookie found" 
      }), { status: 401 })
    }

    let session
    try {
      session = await unsealData(sealedSession, {
        password: process.env.SESSION_SECRET,
      })
      
      logger.info("Session unsealed successfully", {
        sessionKeys: Object.keys(session || {}),
        userEmail: session?.userEmail,
        userRole: session?.userRole,
        userName: session?.userName,
        userStaffId: session?.userStaffId
      })
      
    } catch (error) {
      logger.error("Failed to unseal session in add-applicants API", { 
        error: error.message,
        sessionLength: sealedSession?.length || 0
      })
      return new Response(JSON.stringify({ 
        error: "Invalid session", 
        details: "Session could not be validated" 
      }), { status: 401 })
    }

    // Check if session has required fields
    if (!session || !session.userRole || !session.userEmail) {
      logger.warn("Session missing required fields", {
        hasSession: !!session,
        userRole: session?.userRole,
        userEmail: session?.userEmail,
        sessionData: session
      })
      return new Response(JSON.stringify({ 
        error: "Invalid session", 
        details: "Session missing required user information" 
      }), { status: 401 })
    }

    // Check admin role - using the exact field name from login route
    if (session.userRole !== 'admin') {
      logger.warn("Non-admin access attempt to add-applicants API", {
        hasSession: !!session,
        userRole: session?.userRole,
        userEmail: session?.userEmail,
        userName: session?.userName
      })
      return new Response(JSON.stringify({ 
        error: "Unauthorized", 
        details: "Admin access required" 
      }), { status: 401 })
    }

    logger.info("Authentication successful for add-applicants API", {
      userEmail: session.userEmail,
      userRole: session.userRole,
      userName: session.userName,
      userStaffId: session.userStaffId
    })

    // Parse request body
    const { emails, jobType } = await request.json()

    // Validation
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return new Response(JSON.stringify({ 
        error: "Invalid request", 
        details: "emails array is required and must not be empty" 
      }), { status: 400 })
    }

    if (!jobType || !['Nurse', 'Receptionist', 'Dentist', 'Manager'].includes(jobType)) {
      return new Response(JSON.stringify({ 
        error: "Invalid request", 
        details: "jobType must be one of: Nurse, Receptionist, Dentist, Manager" 
      }), { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const invalidEmails = emails.filter(email => !emailRegex.test(email))
    
    if (invalidEmails.length > 0) {
      return new Response(JSON.stringify({ 
        error: "Invalid request", 
        details: `Invalid email format: ${invalidEmails.join(', ')}` 
      }), { status: 400 })
    }

    // Check if webhook URL is configured
    if (!process.env.MAKE_WEBHOOK_URL_NEW_APPLICATION_FORM) {
      logger.error("MAKE_WEBHOOK_URL_NEW_APPLICATION_FORM environment variable not configured")
      return new Response(JSON.stringify({ 
        error: "Configuration error", 
        details: "Webhook URL not configured" 
      }), { status: 500 })
    }

    // Prepare payload for webhook
    const webhookPayload = {
      emails,
      jobType,
      timestamp: new Date().toISOString(),
      source: 'Admin Panel',
      requestId: `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    }

    logger.info(`Calling webhook for ${emails.length} applicants, job type: ${jobType}`)

    // Call the webhook
    const webhookResponse = await fetch(process.env.MAKE_WEBHOOK_URL_NEW_APPLICATION_FORM, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Smile-Cliniq-Admin-Panel/1.0'
      },
      body: JSON.stringify(webhookPayload)
    })

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text()
      logger.error(`Webhook failed: ${webhookResponse.status} ${webhookResponse.statusText}`, {
        status: webhookResponse.status,
        statusText: webhookResponse.statusText,
        response: errorText,
        payload: webhookPayload
      })
      
      return new Response(JSON.stringify({
        error: "Webhook failed",
        details: `External service returned ${webhookResponse.status}: ${webhookResponse.statusText}`,
        webhookResponse: errorText
      }), { status: 502 })
    }

    // Success response
    logger.info(`Successfully sent ${emails.length} applicants to webhook for ${jobType} position`)
    
    return new Response(JSON.stringify({
      success: true,
      message: `Successfully submitted ${emails.length} applicant(s) for ${jobType} position`,
      data: {
        emails,
        jobType,
        requestId: webhookPayload.requestId,
        timestamp: webhookPayload.timestamp
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })

  } catch (error) {
    logger.error("Error in add-applicants API:", error)
    
    return new Response(JSON.stringify({
      error: "Internal server error",
      details: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred",
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
}
