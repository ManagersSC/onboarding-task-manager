import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import logger from "@/lib/utils/logger"

/**
 * Test endpoint for bulk delete tasks functionality
 * This endpoint provides a safe way to test the bulk delete API
 * without affecting real data or triggering automations
 */
export async function POST(request) {
  let userEmail, userRole, userName

  try {
    // Authentication check
    const sessionCookie = (await cookies()).get("session")?.value
    if (!sessionCookie) {
      logger.debug("API BULK DELETE TASKS TEST: No session cookie")
      return Response.json({ error: "Unauthorised" }, { status: 401 })
    }

    let session
    try {
      session = await unsealData(sessionCookie, {
        password: process.env.SESSION_SECRET,
        ttl: 60 * 60 * 8,
      })
    } catch (err) {
      logger.debug(`Invalid session: ${err.message}`)
      return Response.json(
        { error: "Invalid Session", details: process.env.NODE_ENV === "development" ? err.message : null },
        { status: 401 }
      )
    }

    if (!session.userEmail) {
      logger.debug("Invalid session format")
      return Response.json({ error: "Invalid session format" }, { status: 401 })
    }

    userRole = session.userRole
    if (userRole !== "admin") {
      return Response.json({ error: "Unauthorised" }, { status: 401 })
    }

    userEmail = session.userEmail
    userName = session.userName

    const { testTaskIds = [] } = await request.json()

    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      logger.error("Server configuration error: Missing Airtable credentials")
      return Response.json({ error: "Server configuration error" }, { status: 500 })
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
      .base(process.env.AIRTABLE_BASE_ID)

    // Test 1: Validate API connection
    let connectionTest = false
    try {
      await base('Onboarding Tasks').select({ maxRecords: 1 }).firstPage()
      connectionTest = true
    } catch (err) {
      logger.error("Airtable connection test failed:", err)
    }

    // Test 2: Check if test IDs exist (optional)
    const existingIds = []
    const nonExistentIds = []
    
    if (testTaskIds.length > 0) {
      for (const id of testTaskIds) {
        try {
          await base('Onboarding Tasks').find(id)
          existingIds.push(id)
        } catch (err) {
          nonExistentIds.push(id)
        }
      }
    }

    // Test 3: Simulate bulk delete process
    const simulatedResults = {
      totalProcessed: testTaskIds.length,
      wouldSucceed: existingIds.length,
      wouldFail: nonExistentIds.length,
      processingTime: Date.now()
    }

    logger.info(`Bulk delete tasks test completed for user: ${userEmail}`)

    return Response.json({
      success: true,
      message: "Bulk delete tasks test completed successfully",
      testResults: {
        connectionTest,
        simulatedResults,
        existingIds,
        nonExistentIds,
        timestamp: new Date().toISOString(),
        testedBy: userEmail
      },
      instructions: {
        nextSteps: [
          "1. If connectionTest is true, your Airtable connection is working",
          "2. existingIds shows which IDs would be successfully processed",
          "3. nonExistentIds shows which IDs would fail",
          "4. Use the main bulk-delete endpoint with testMode: true for full testing"
        ]
      }
    })

  } catch (error) {
    logger.error("Error in bulk delete tasks test:", error)
    return Response.json({ 
      error: "Test failed", 
      details: process.env.NODE_ENV === "development" ? error.message : null 
    }, { status: 500 })
  }
}
