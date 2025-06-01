import Airtable from "airtable";
import { cookies } from "next/headers";
import { unsealData } from "iron-session";

// --- Server-side cache ---
let quickMetricsCache = null;
let quickMetricsCacheTime = 0;
const CACHE_TTL = 60 * 1000; // 60 seconds

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

  // Helper: get start of current month in ISO format
  function getStartOfCurrentMonth() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }
  // Helper: get start of last month in ISO format
  function getStartOfLastMonth() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  }
  // Helper: get end of last month in ISO format
  function getEndOfLastMonth() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).toISOString();
  }
  // Helper: get start/end of this week
  function getStartOfWeek() {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
    return new Date(now.setDate(diff));
  }
  function getEndOfWeek() {
    const start = getStartOfWeek();
    return new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  }
  // Helper: average of numeric array
  function average(arr) {
    const nums = arr.filter(x => typeof x === "number" && !isNaN(x));
    if (!nums.length) return null;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  }
  // Helper: group and count by field
  function groupAndCount(records, field) {
    return records.reduce((acc, rec) => {
      const val = rec.fields[field] || "Unknown";
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    }, {});
  }

  // Fetch all metrics in parallel, handle errors gracefully
  const errors = {};
  let applicants = [], jobs = [], tasks = [], summaryRecords = [];
  const startOfMonth = getStartOfCurrentMonth();
  const startOfLastMonth = getStartOfLastMonth();
  const endOfLastMonth = getEndOfLastMonth();
  const startOfWeek = getStartOfWeek();
  const endOfWeek = getEndOfWeek();

  // Helper for paginated fetch
  async function fetchAll(base, table, options) {
    let all = [];
    try {
      await base(table)
        .select(options || {})
        .eachPage((records, fetchNextPage) => {
          all = all.concat(records);
          fetchNextPage();
        });
      return all;
    } catch (e) {
      throw e;
    }
  }

  try {
    [applicants, jobs, tasks, summaryRecords] = await Promise.all([
      fetchAll(base, "Applicants", { fields: ["Stage", "Created Time", "Onboarding Status"] }),
      fetchAll(base, "Jobs", { fields: ["Job Status"] }),
      fetchAll(base, "Tasks", { fields: ["🚀 Status"] }),
      fetchAll(base, "Summary", { fields: ["Progression", "Quiz Pass Rate"] }),
    ]);
  } catch (e) {
    errors.general = e.message;
  }

  // --- Blocked Items (from Tasks table) ---
  let blockedItems = 0, blockedItemsLastMonth = 0, blockedItemsMonthlyChange = null;
  try {
    blockedItems = tasks.filter(t => (t.fields["🚀 Status"] || "").toLowerCase() === "blocked").length;
    // For monthly change, you would need a created/updated time field in Tasks. Placeholder for now:
    blockedItemsLastMonth = null;
    blockedItemsMonthlyChange = null;
  } catch (e) {
    errors.blockedItems = e.message;
  }

  // --- Metric helpers for easy future swap ---
  function getCompletionRate(/* tasks */) {
    // TODO: Implement real logic when ready
    return 11.11;
  }
  function getTasksDueThisWeek(/* tasks */) {
    // TODO: Implement real logic when ready
    return 11.11;
  }
  function getTasksDueThisWeekLastMonth(/* tasks */) {
    // TODO: Implement real logic when ready
    return 11.11;
  }
  function getTasksDueThisWeekMonthlyChange(/* tasks */) {
    // TODO: Implement real logic when ready
    return 11.11;
  }
  function getCompletionRateLastMonth(/* tasks */) {
    // TODO: Implement real logic when ready
    return 11.11;
  }
  function getCompletionRateMonthlyChange(/* tasks */) {
    // TODO: Implement real logic when ready
    return 11.11;
  }

  // --- Use helpers for placeholder metrics ---
  const tasksDueThisWeek = getTasksDueThisWeek();
  const tasksDueThisWeekLastMonth = getTasksDueThisWeekLastMonth();
  const tasksDueThisWeekMonthlyChange = getTasksDueThisWeekMonthlyChange();
  const completionRate = getCompletionRate();
  const completionRateLastMonth = getCompletionRateLastMonth();
  const completionRateMonthlyChange = getCompletionRateMonthlyChange();

  // --- Active Onboardings (from Applicants table) ---
  const completedStatuses = ["Docs Signed", "Week 4 Quiz ✅", "Week 3 Quiz ✅", "Week 2 Quiz ✅", "Week 1 Quiz ✅"];
  const activeOnboardings = applicants.filter(a => a.fields["Stage"] === "Hired" && (!a.fields["Onboarding Status"] || !completedStatuses.includes(a.fields["Onboarding Status"]))).length;
  let activeOnboardingsThisMonth = 0, activeOnboardingsLastMonth = 0, activeOnboardingsMonthlyChange = null;
  try {
    activeOnboardingsThisMonth = applicants.filter(a => a.fields["Stage"] === "Hired" && (!a.fields["Onboarding Status"] || !completedStatuses.includes(a.fields["Onboarding Status"])) && a.fields["Created Time"] && new Date(a.fields["Created Time"]) >= new Date(startOfMonth)).length;
    activeOnboardingsLastMonth = applicants.filter(a => a.fields["Stage"] === "Hired" && (!a.fields["Onboarding Status"] || !completedStatuses.includes(a.fields["Onboarding Status"])) && a.fields["Created Time"] && new Date(a.fields["Created Time"]) >= new Date(startOfLastMonth) && new Date(a.fields["Created Time"]) < new Date(startOfMonth)).length;
    activeOnboardingsMonthlyChange = activeOnboardingsLastMonth > 0 ? ((activeOnboardingsThisMonth - activeOnboardingsLastMonth) / activeOnboardingsLastMonth) * 100 : null;
  } catch (e) {
    errors.activeOnboardingsMonthlyChange = e.message;
  }

  // --- Compose response ---
  const result = {
    // Dashboard metrics
    activeOnboardings,
    activeOnboardingsThisMonth,
    activeOnboardingsLastMonth,
    activeOnboardingsMonthlyChange,
    tasksDueThisWeek,
    tasksDueThisWeekLastMonth,
    tasksDueThisWeekMonthlyChange,
    completionRate,
    completionRateLastMonth,
    completionRateMonthlyChange,
    blockedItems,
    blockedItemsLastMonth,
    blockedItemsMonthlyChange,
    // Existing metrics
    totalApplicants: applicants?.length ?? null,
    applicantsByStage: applicants?.length ? groupAndCount(applicants, "Stage") : null,
    totalHired: applicants?.filter(a => a.fields["Stage"] === "Hired").length ?? null,
    hiresThisMonth: applicants?.filter(a => a.fields["Stage"] === "Hired" && a.fields["Created Time"] && new Date(a.fields["Created Time"]) >= new Date(startOfMonth)).length ?? null,
    totalJobs: jobs?.length ?? null,
    openJobs: jobs?.length ? jobs.filter(j => j.fields["Job Status"] === "Open").length : null,
    taskCompletionRate: completionRate, // alias for backward compatibility
    overdueTasks: null, // Not implemented
    onboardingProgress: summaryRecords?.length ? average(summaryRecords.map(r => r.fields["Progression"])) : null,
    quizPassRate: summaryRecords?.length ? average(summaryRecords.map(r => r.fields["Quiz Pass Rate"])) : null,
    applicantsThisMonth: applicants?.filter(a => a.fields["Created Time"] && new Date(a.fields["Created Time"]) >= new Date(startOfMonth)).length ?? null,
    applicantsLastMonth: applicants?.filter(a => {
      const date = a.fields["Created Time"] ? new Date(a.fields["Created Time"]) : null;
      return date && date >= new Date(startOfLastMonth) && date < new Date(startOfMonth);
    }).length ?? null,
    applicantsMonthlyChange: null, // Not implemented
    hiredThisMonth: applicants?.filter(a => a.fields["Stage"] === "Hired" && a.fields["Created Time"] && new Date(a.fields["Created Time"]) >= new Date(startOfMonth)).length ?? null,
    hiredLastMonth: applicants?.filter(a => {
      const date = a.fields["Created Time"] ? new Date(a.fields["Created Time"]) : null;
      return a.fields["Stage"] === "Hired" && date && date >= new Date(startOfLastMonth) && date < new Date(startOfMonth);
    }).length ?? null,
    hiredMonthlyChange: null, // Not implemented
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