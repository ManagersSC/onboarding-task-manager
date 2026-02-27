import Airtable from "airtable"
import logger from "../logger"

// Improved status mapping function with case-insensitive comparison
function getStatusGroup(status) {
  const normalizedStatus = (status || "").toLowerCase().trim()

  if (normalizedStatus === "today" || normalizedStatus === "in-progress") {
    return "upcoming"
  } else if (normalizedStatus === "overdue") {
    return "overdue"
  } else if (normalizedStatus === "flagged") {
    return "flagged"
  }

  return "upcoming" // Default fallback
}

// Utility function to format dates in a relative way
export function formatRelativeDate(dateString) {
  if (!dateString) return ""

  const today = new Date()
  today.setHours(0, 0, 0, 0) // Reset time part for accurate day comparison

  const dueDate = new Date(dateString)
  dueDate.setHours(0, 0, 0, 0)

  const diffTime = dueDate - today
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return `${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? "day" : "days"} ago`
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Tomorrow"
  if (diffDays < 7) return `In ${diffDays} days`

  return new Date(dateString).toLocaleDateString()
}

async function getStaffNameById(base, staffId) {
  if (!staffId) return ""
  try {
    const record = await base("Staff").find(staffId)
    return record.fields["Name"] || ""
  } catch (e) {
    logger.error(`Error fetching staff name: ${e.message}`)
    return ""
  }
}

export async function getTasksWithCreator() {
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    throw new Error("Airtable environment variables are missing")
  }
  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

  // Fetch all tasks except those with status 'Completed'
  const tasks = await base("Tasks")
    .select({
      filterByFormula: `NOT({🚀 Status} = 'Completed')`,
    })
    .all()

  // For each task, fetch assigned staff and creator by record ID
  const taskObjs = await Promise.all(
    tasks.map(async (task) => {
      // Find creator (created by)
      let creatorName = ""
      if (Array.isArray(task.fields["👩 Created By"]) && task.fields["👩 Created By"].length > 0) {
        const staffId = task.fields["👩 Created By"][0]
        creatorName = await getStaffNameById(base, staffId)
      }
      // Find assigned staff (for)
      let assignedStaffName = ""
      if (Array.isArray(task.fields["👨 Assigned Staff"]) && task.fields["👨 Assigned Staff"].length > 0) {
        const staffId = task.fields["👨 Assigned Staff"][0]
        assignedStaffName = await getStaffNameById(base, staffId)
      }

      // Format the due date as a relative date
      const rawDueDate = task.fields["📆 Due Date"] || ""
      const formattedDueDate = formatRelativeDate(rawDueDate)

      // Ensure priority is properly normalized
      const priority = (task.fields["🚨 Urgency"] || "").toLowerCase().trim()

      return {
        id: task.id,
        title: task.fields["📌 Task"] || "",
        description: task.fields["📖 Task Detail"] || "",
        rawDueDate: rawDueDate, // Keep the original date for sorting
        dueDate: formattedDueDate, // Add the formatted date
        priority: task.fields["🚨 Urgency"] || "medium", // Keep original case for display
        status: (task.fields["🚀 Status"] || "").toLowerCase().trim(),
        createdBy: creatorName,
        for: assignedStaffName,
        flaggedReason: task.fields["Flagged Reason"] || "",
      }
    }),
  )

  // Group by status (excluding completed)
  const grouped = { upcoming: [], overdue: [], flagged: [] }
  for (const task of taskObjs) {
    const group = getStatusGroup(task.status)
    if (grouped[group]) {
      grouped[group].push(task)
    } else {
      // If group is not defined, ignore or add to upcoming
      grouped.upcoming.push(task)
    }
  }

  // Priority order for sorting
  const priorityOrder = {
    "very high": 1,
    high: 2,
    medium: 3,
    low: 4,
    "very low": 5,
  }

  // Sort tasks by priority and then by due date within each group
  for (const group in grouped) {
    grouped[group].sort((a, b) => {
      // First sort by priority
      const aPriority = (a.priority || "").toLowerCase().trim()
      const bPriority = (b.priority || "").toLowerCase().trim()

      const priorityDiff = (priorityOrder[aPriority] || 999) - (priorityOrder[bPriority] || 999)

      if (priorityDiff !== 0) return priorityDiff

      // Then sort by due date
      if (!a.rawDueDate) return 1
      if (!b.rawDueDate) return -1
      return new Date(a.rawDueDate) - new Date(b.rawDueDate)
    })
  }

  return grouped
}


export async function completeStaffTask(taskId, completedById){
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    throw new Error("Airtable environment variables are missing")
  }
  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

  logger.info("Completing task:", taskId)
  try {
    const record = await base("Tasks").find(taskId);
    console.log("Found record:", record);
  } catch (e) {
    logger.error("Record not found in Tasks table:", e);
  }

  await base("Tasks").update([
    {
      id: taskId,
      fields: {
        // Use field IDs from ATS schema
        "fldcOYboUu2vDASCl": "Completed",     // 🚀 Status
        "fld15xSpsrFIO0ONh": [],              // 👨 Assigned Staff
        "fldExdpb2dPzlR8zV": null,            // Claimed Date
        // Best-effort attribution using dedicated field from ATS schema:
        // Completed By (link to Staff): fld7fsKOvSDOQrgqn
        ...(completedById ? { "fld7fsKOvSDOQrgqn": [completedById] } : {}),
        // Use date-only field present in schema
        "flddxTSDbSiHOD0a2": new Date().toISOString().slice(0, 10), // Completed Date (YYYY-MM-DD)
      }
    }
  ]);
}

export async function deleteStaffTask(taskId) {
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    throw new Error("Airtable environment variables are missing");
  }
  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

  logger.info("Deleting task:", taskId);
  try {
    await base("Tasks").destroy([taskId]);
  } catch (e) {
    // Treat "record not found" as already deleted — idempotent delete
    const msg = e?.message || "";
    if (msg.includes("Could not find a record") || msg.includes("NOT_FOUND") || e?.statusCode === 404) {
      logger.info("Task already deleted (record not found), treating as success:", taskId);
      return;
    }
    logger.error("Error deleting task in Tasks table:", e);
    throw e;
  }
}

export async function editStaffTask(taskId, fields) {
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    throw new Error("Airtable environment variables are missing");
  }
  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

  // Map fields to Airtable columns
  const airtableFields = {};
  if (fields.title !== undefined) airtableFields["📌 Task"] = fields.title;
  if (fields.description !== undefined) airtableFields["📖 Task Detail"] = fields.description;
  if (fields.flaggedReason !== undefined) airtableFields["Flagged Reason"] = fields.flaggedReason;
  if (fields.priority !== undefined) airtableFields["🚨 Urgency"] = fields.priority;
  if (fields.status !== undefined) airtableFields["🚀 Status"] = fields.status;
  // Handle due date - only include if it's not null/empty
  if (fields.dueDate !== undefined && fields.dueDate !== null && fields.dueDate !== "") {
    airtableFields["📆 Due Date"] = fields.dueDate;
  } else if (fields.dueDate === null || fields.dueDate === "") {
    // Clear the due date field
    airtableFields["📆 Due Date"] = null;
  }
  if (fields.for !== undefined) airtableFields["👨 Assigned Staff"] = fields.for;
  if (fields.claimedDate !== undefined) airtableFields["Claimed Date"] = fields.claimedDate;
  // Completion attribution (optional) mapped onto dedicated Tasks field:
  // Completed By (link to Staff): fld7fsKOvSDOQrgqn
  if (fields.completedById !== undefined) {
    airtableFields["fld7fsKOvSDOQrgqn"] = Array.isArray(fields.completedById)
      ? fields.completedById
      : (fields.completedById ? [fields.completedById] : []);
  }
  if (fields.completedAt !== undefined) {
    // Expect ISO date or datetime; coerce to YYYY-MM-DD for the date field
    const d = fields.completedAt ? String(fields.completedAt) : "";
    airtableFields["flddxTSDbSiHOD0a2"] = d ? d.slice(0, 10) : null;
  }
  // Flagging metadata (using field IDs from ATS schema)
  if (fields.flaggedById !== undefined) {
    airtableFields["fldtmqhschTQG0BLw"] = Array.isArray(fields.flaggedById)
      ? fields.flaggedById
      : (fields.flaggedById ? [fields.flaggedById] : []);
  }
  if (fields.flaggedAt !== undefined) airtableFields["fldqaOZiXihM1circ"] = fields.flaggedAt || null;
  if (fields.flagResolvedById !== undefined) {
    airtableFields["fldS28s9A4cJoq3mH"] = Array.isArray(fields.flagResolvedById)
      ? fields.flagResolvedById
      : (fields.flagResolvedById ? [fields.flagResolvedById] : []);
  }
  if (fields.flagResolvedAt !== undefined) airtableFields["fldeajCdUH8GTf5yM"] = fields.flagResolvedAt || null;
  if (fields.resolutionNote !== undefined) airtableFields["fldzYQy1iZLI9SZvg"] = fields.resolutionNote;
  // createdBy is not editable

  try {
    const updated = await base("Tasks").update([
      {
        id: taskId,
        fields: airtableFields,
      },
    ]);
    return updated[0];
  } catch (e) {
    logger.error("Error updating task:", e);
    throw e;
  }
}

/**
 * Claim a global (unassigned) task for a user.
 * Throws an error if the task is already assigned.
 * @param {string} taskId - The Airtable record ID of the task
 * @param {string} userId - The Airtable record ID of the staff/user claiming the task
 * @returns {object} The updated Airtable record
 */
export async function claimStaffTask(taskId, userId) {
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    throw new Error("Airtable environment variables are missing");
  }
  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

  // Fetch the task
  let record;
  try {
    record = await base("Tasks").find(taskId);
  } catch (e) {
    logger.error("Task not found in Tasks table:", e);
    throw new Error("Task not found");
  }

  // Check if already assigned
  if (Array.isArray(record.fields["👨 Assigned Staff"]) && record.fields["👨 Assigned Staff"].length > 0) {
    throw new Error("Task already claimed");
  }

  // Assign to user
  try {
    const updated = await base("Tasks").update([
      {
        id: taskId,
        fields: {
          "👨 Assigned Staff": [userId],
          "Claimed Date": new Date().toISOString(),
        },
      },
    ]);
    return updated[0];
  } catch (e) {
    logger.error("Error updating task for claim:", e);
    throw e;
  }
}