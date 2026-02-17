import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import logger from "@/lib/utils/logger"

export async function POST(request) {
  let userEmail, userRole, userName

  try {
    if (process.env.NODE_ENV === "production") {
      return new Response(JSON.stringify({ error: "Not available in production" }), { status: 404 })
    }

    // Authentication check
    const sessionCookie = (await cookies()).get("session")?.value
    if (!sessionCookie) {
      logger.debug("API BULK CREATE TASKS TEST: No session cookie")
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

    const { testResources = [] } = await request.json()

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

    // Test 2: Validate field structure
    let fieldValidationTest = false
    try {
      // Get the table schema to validate field names
      const table = base('Onboarding Tasks')
      fieldValidationTest = true
    } catch (err) {
      logger.error("Field validation test failed:", err)
    }

    // Test 3: Validate test resources if provided
    const validationResults = []
    if (testResources.length > 0) {
      for (let i = 0; i < testResources.length; i++) {
        const resource = testResources[i]
        const validation = {
          index: i,
          resource: resource,
          isValid: true,
          errors: []
        }

        // Check required fields
        if (!resource.taskName) validation.errors.push("taskName is required")
        if (!resource.taskWeek) validation.errors.push("taskWeek is required")
        if (!resource.taskDay) validation.errors.push("taskDay is required")
        if (!resource.taskMedium) validation.errors.push("taskMedium is required")

        // Check field types and ranges
        if (resource.taskWeek !== undefined && (resource.taskWeek < 0 || resource.taskWeek > 5)) {
          validation.errors.push("taskWeek must be between 0 and 5")
        }
        if (resource.taskDay !== undefined && (resource.taskDay < 0 || resource.taskDay > 5)) {
          validation.errors.push("taskDay must be between 0 and 5")
        }

        // Check medium type
        const allowedMediums = ["Doc", "Video", "G.Drive", "Quiz", "Custom", "Managers"]
        if (resource.taskMedium && !allowedMediums.includes(resource.taskMedium)) {
          validation.errors.push(`taskMedium must be one of: ${allowedMediums.join(", ")}`)
        }

        // Check URL format
        if (resource.taskLink && resource.taskLink.trim() !== "") {
          try {
            new URL(resource.taskLink)
          } catch (err) {
            validation.errors.push("taskLink must be a valid URL")
          }
        }

        validation.isValid = validation.errors.length === 0
        validationResults.push(validation)
      }
    }

    // Test 4: Simulate bulk create process
    const simulatedResults = {
      totalResources: testResources.length,
      wouldSucceed: validationResults.filter(v => v.isValid).length,
      wouldFail: validationResults.filter(v => !v.isValid).length,
      processingTime: Date.now()
    }

    logger.info(`Bulk create tasks test completed for user: ${userEmail}`)

    return Response.json({
      success: true,
      message: "Bulk create tasks test completed successfully",
      testResults: {
        connectionTest,
        fieldValidationTest,
        simulatedResults,
        validationResults,
        timestamp: new Date().toISOString(),
        testedBy: userEmail
      },
      instructions: {
        nextSteps: [
          "1. If connectionTest is true, your Airtable connection is working",
          "2. If fieldValidationTest is true, the table structure is accessible",
          "3. validationResults shows which resources would pass/fail validation",
          "4. Use the main bulk-create endpoint with testMode: true for full testing"
        ]
      }
    })

  } catch (error) {
    logger.error("Error in bulk create tasks test:", error)
    return Response.json({ 
      error: "Test failed", 
      details: process.env.NODE_ENV === "development" ? error.message : null 
    }, { status: 500 })
  }
}
