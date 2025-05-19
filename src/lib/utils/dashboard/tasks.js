import Airtable from "airtable"
import logger from "../logger"

// Improved status mapping function with case-insensitive comparison
function getStatusGroup(status) {
  const normalizedStatus = (status || "").toLowerCase().trim()

  if (normalizedStatus === "today" || normalizedStatus === "in-progress") {
    return "upcoming"
  } else if (normalizedStatus === "overdue") {
    return "overdue"
  } else if (normalizedStatus === "blocked") {
    return "blocked"
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
        id: task.fields["Id"] || task.id,
        title: task.fields["📌 Task"] || "",
        description: task.fields["📖 Task Detail"] || "",
        rawDueDate: rawDueDate, // Keep the original date for sorting
        dueDate: formattedDueDate, // Add the formatted date
        priority: task.fields["🚨 Urgency"] || "medium", // Keep original case for display
        status: (task.fields["🚀 Status"] || "").toLowerCase().trim(),
        createdBy: creatorName,
        for: assignedStaffName,
        blockedReason: task.fields["Blocked Reason"] || "",
      }
    }),
  )

  // Group by status (excluding completed)
  const grouped = { upcoming: [], overdue: [], blocked: [] }
  for (const task of taskObjs) {
    const group = getStatusGroup(task.status)
    grouped[group].push(task)
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


export async function completeStaffTask(taskId){
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    throw new Error("Airtable environment variables are missing")
  }
  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

  await base("Staff").update([
    {
      id: taskId,
      fields: {
        "🚀 Status": "Completed"
      }
    }
  ]);
}