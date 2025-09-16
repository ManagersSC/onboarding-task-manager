import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import logger from "@/lib/utils/logger"
import { logAuditEvent } from "@/lib/auditLogger"

export async function POST(request) {
  let userEmail, userRole, userName

  try {
    // Authentication check
    const sessionCookie = (await cookies()).get("session")?.value
    if (!sessionCookie) {
      logger.debug("API BULK CREATE TASKS: No session cookie")
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

    logger.info("Bulk create request started", { userEmail, userName })

    let requestBody
    try {
      requestBody = await request.json()
      logger.info("Bulk create request body:", JSON.stringify(requestBody, null, 2))
    } catch (err) {
      logger.error("Failed to parse request JSON:", err)
      return Response.json({ 
        error: "Invalid JSON in request body",
        details: process.env.NODE_ENV === "development" ? err.message : null
      }, { status: 400 })
    }
    
    const { resources } = requestBody
    const testMode = false // Force production mode
    
    if (!Array.isArray(resources) || resources.length === 0) {
      logger.error("Invalid request: resources array is required or empty", { resources })
      return Response.json({ error: "Invalid request: resources array is required" }, { status: 400 })
    }
    
    logger.info(`Processing ${resources.length} resources in ${testMode ? 'TEST' : 'PRODUCTION'} mode`)

    // Validate each resource
    for (let i = 0; i < resources.length; i++) {
      const resource = resources[i]
      logger.info(`Validating resource ${i}:`, JSON.stringify(resource, null, 2))
      
      if (!resource.taskName || !resource.taskWeek || !resource.taskDay || !resource.taskMedium) {
        const missingFields = []
        if (!resource.taskName) missingFields.push('taskName')
        if (!resource.taskWeek) missingFields.push('taskWeek')
        if (!resource.taskDay) missingFields.push('taskDay')
        if (!resource.taskMedium) missingFields.push('taskMedium')
        
        logger.error(`Validation failed for resource ${i}: missing fields`, { 
          resource, 
          missingFields,
          resourceKeys: Object.keys(resource)
        })
        
        return Response.json({ 
          error: `Invalid resource at index ${i}: ${missingFields.join(', ')} are required`,
          details: {
            resourceIndex: i,
            missingFields,
            receivedFields: Object.keys(resource)
          }
        }, { status: 400 })
      }

      // Validate week and day numbers (0-5)
      if (resource.taskWeek < 0 || resource.taskWeek > 5) {
        logger.error(`Validation failed for resource ${i}: invalid taskWeek`, { 
          resource, 
          taskWeek: resource.taskWeek,
          expectedRange: "0-5"
        })
        return Response.json({ 
          error: `Invalid resource at index ${i}: taskWeek must be between 0 and 5`,
          details: {
            resourceIndex: i,
            field: 'taskWeek',
            value: resource.taskWeek,
            expectedRange: "0-5"
          }
        }, { status: 400 })
      }

      if (resource.taskDay < 0 || resource.taskDay > 5) {
        logger.error(`Validation failed for resource ${i}: invalid taskDay`, { 
          resource, 
          taskDay: resource.taskDay,
          expectedRange: "0-5"
        })
        return Response.json({ 
          error: `Invalid resource at index ${i}: taskDay must be between 0 and 5`,
          details: {
            resourceIndex: i,
            field: 'taskDay',
            value: resource.taskDay,
            expectedRange: "0-5"
          }
        }, { status: 400 })
      }

      // Validate medium type
      const allowedMediums = ["Document", "Video"]
      if (!allowedMediums.includes(resource.taskMedium)) {
        logger.error(`Validation failed for resource ${i}: invalid taskMedium`, { 
          resource, 
          taskMedium: resource.taskMedium,
          allowedMediums
        })
        return Response.json({ 
          error: `Invalid resource at index ${i}: taskMedium must be one of: ${allowedMediums.join(", ")}`,
          details: {
            resourceIndex: i,
            field: 'taskMedium',
            value: resource.taskMedium,
            allowedValues: allowedMediums
          }
        }, { status: 400 })
      }

      // Validate URL format if provided
      if (resource.taskLink && resource.taskLink.trim() !== "") {
        try {
          new URL(resource.taskLink)
        } catch (err) {
          logger.error(`Validation failed for resource ${i}: invalid taskLink`, { 
            resource, 
            taskLink: resource.taskLink,
            error: err.message
          })
          return Response.json({ 
            error: `Invalid resource at index ${i}: taskLink must be a valid URL`,
            details: {
              resourceIndex: i,
              field: 'taskLink',
              value: resource.taskLink,
              error: err.message
            }
          }, { status: 400 })
        }
      }
      
      logger.info(`Resource ${i} validation passed`)
    }

    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      logger.error("Server configuration error: Missing Airtable credentials")
      return Response.json({ error: "Server configuration error" }, { status: 500 })
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

    const createdIds = []
    const failedResources = []
    
    // Create resources (or simulate in test mode)
    for (let i = 0; i < resources.length; i++) {
      const resource = resources[i]
      
      try {
        // Map form values to Airtable values
        const mediumMapping = {
          "Document": "Doc",
          "Video": "Video"
        }

        const fields = {
          "Task": resource.taskName,
          "Task Body": resource.taskDescription || "",
          "Week Number": resource.taskWeek.toString(),
          "Day Number": resource.taskDay.toString(),
          "Task Function": "Core", // All bulk resources are Core tasks
          "Type": mediumMapping[resource.taskMedium] || resource.taskMedium,
          "Link": resource.taskLink || ""
        }

        // Add folder if provided
        if (resource.taskFolder) {
          fields["Folder Name"] = [resource.taskFolder]
        }

        // Add job if provided
        if (resource.taskJob) {
          fields["Job"] = [resource.taskJob]
        }

        if (testMode) {
          // In test mode, just simulate the creation
          logger.info(`TEST MODE: Would create resource: ${resource.taskName}`)
          createdIds.push(`test_${i}`)
        } else {
          // Actually create the resource
          const record = await base('Onboarding Tasks').create(fields)
          createdIds.push(record.id)
          logger.info(`Successfully created resource: ${resource.taskName} (${record.id})`)
        }
      } catch (err) {
        logger.error(`Error creating resource ${resource.taskName}:`, err)
        failedResources.push({
          index: i,
          resource: resource,
          error: err.message
        })
      }
    }

    // Log audit event (only for real creations, not test mode)
    if (!testMode) {
      const createdTitles = resources
        .filter((_, index) => createdIds.includes(`test_${index}`) || createdIds.some(id => id !== `test_${index}`))
        .map(resource => resource.taskName)
        .join(', ')

      logAuditEvent({
        eventType: "Bulk Resource Creation",
        eventStatus: failedResources.length === 0 ? "Success" : "Partial Success",
        userRole,
        userName,
        userIdentifier: userEmail,
        detailedMessage: `Created ${createdIds.length} resources: ${createdTitles}${failedResources.length ? `, ${failedResources.length} failed` : ""}`,
        request,
      })
    } else {
      logger.info(`TEST MODE: Bulk create simulation completed for ${createdIds.length} resources`)
    }

    return Response.json({
      success: true,
      message: testMode
        ? `TEST MODE: Would create ${createdIds.length} resources${failedResources.length ? `, ${failedResources.length} would fail` : ""}`
        : `${createdIds.length} resources created successfully${failedResources.length ? `, ${failedResources.length} failed` : ""}`,
      createdIds,
      failedResources,
      testMode
    })

  } catch (error) {
    logger.error("Error in bulk create tasks:", error)
    return Response.json({ 
      error: "Internal server error", 
      details: process.env.NODE_ENV === "development" ? error.message : null 
    }, { status: 500 })
  }
}