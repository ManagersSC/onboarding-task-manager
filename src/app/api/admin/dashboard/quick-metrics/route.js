import Airtable from "airtable";
import { cookies } from "next/headers";
import { unsealData } from "iron-session";

// --- Server-side cache ---
let quickMetricsCache = null;
let quickMetricsCacheTime = 0;
const CACHE_TTL = 60 * 1000; // 60 seconds

// Helper: Calculate number of weeks in last month
function getWeeksInLastMonth() {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const year = lastMonth.getFullYear();
  const month = lastMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  // Count Mondays in the month
  let mondays = 0;
  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === 1) mondays++;
  }
  // If the month doesn't start on Monday, add 1 to count the first partial week
  if (firstDay.getDay() !== 1) mondays++;
  return mondays;
}

// Helper: Fetch record count from Airtable view
async function fetchAirtableCount(base, table, view) {
  let count = 0;
  try {
    await base(table)
      .select({ view }) // No fields specified
      .eachPage((records, fetchNextPage) => {
        count += records.length;
        fetchNextPage();
      });
    return count;
  } catch (e) {
    throw new Error(`Airtable error for ${table} (${view}): ${e.message}`);
  }
}

export async function GET() {
  // Check cache first
  const now = Date.now();
  if (quickMetricsCache && (now - quickMetricsCacheTime < CACHE_TTL)) {
    return new Response(JSON.stringify(quickMetricsCache), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Session validation (admin only)
  try {
    const cookieStore = await cookies();
    const sealedSession = cookieStore.get("session")?.value;
    if (!sealedSession) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 });
    }
    const session = await unsealData(sealedSession, {
      password: process.env.SESSION_SECRET,
    });
    if (!session || session.userRole !== "admin") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Session validation failed", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Airtable setup
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    return new Response(
      JSON.stringify({ error: "Airtable environment variables are missing" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

  // Fetch counts from views
  let applicantsCurrent = 0, applicantsLast = 0, tasksThisWeek = 0, tasksLastMonth = 0;
  const errors = {};
  try {
    [applicantsCurrent, applicantsLast, tasksThisWeek, tasksLastMonth] = await Promise.all([
      fetchAirtableCount(base, "Applicants", "Active Onboardings (Current Month)"),
      fetchAirtableCount(base, "Applicants", "Active Onboardings (Last Month)"),
      fetchAirtableCount(base, "Tasks", "Tasks Due This Week"),
      fetchAirtableCount(base, "Tasks", "Tasks Due Last Month"),
    ]);
  } catch (e) {
    errors.fetch = e.message;
  }

  // Calculate number of weeks in last month
  const numWeeksLastMonth = getWeeksInLastMonth();
  const tasksLastMonthAvgWeek = numWeeksLastMonth > 0 ? tasksLastMonth / numWeeksLastMonth : 0;

  // Calculate changes
  const activeOnboardingsMonthlyChange = applicantsLast > 0 ? ((applicantsCurrent - applicantsLast) / applicantsLast) * 100 : null;
  const tasksDueThisWeekMonthlyChange = tasksLastMonthAvgWeek > 0 ? ((tasksThisWeek - tasksLastMonthAvgWeek) / tasksLastMonthAvgWeek) * 100 : null;

  // Compose response
  const result = {
    activeOnboardings: applicantsCurrent,
    activeOnboardingsLastMonth: applicantsLast,
    activeOnboardingsMonthlyChange,
    tasksDueThisWeek: tasksThisWeek,
    tasksDueLastMonth: tasksLastMonth,
    tasksDueLastMonthAverageWeek: tasksLastMonthAvgWeek,
    tasksDueThisWeekMonthlyChange,
    errors: Object.keys(errors).length ? errors : undefined,
  };

  // Update cache
  quickMetricsCache = result;
  quickMetricsCacheTime = now;

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
} 