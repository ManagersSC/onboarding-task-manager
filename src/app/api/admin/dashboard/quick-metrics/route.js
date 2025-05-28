import Airtable from "airtable";
import { cookies } from "next/headers";
import { unsealData } from "iron-session";

export async function GET() {
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
  let applicants = [], hiredApplicants = [], hiredThisMonth = [], jobs = [], onboardingTasks = [], summaryRecords = [];
  const startOfMonth = getStartOfCurrentMonth();

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
    [applicants, jobs, onboardingTasks, summaryRecords] = await Promise.all([
      fetchAll(base, "Applicants", { fields: ["Stage", "Created Time"] }),
      fetchAll(base, "Jobs", { fields: ["Job Status"] }),
      fetchAll(base, "Onboarding Tasks Logs", { fields: ["Status"] }),
      fetchAll(base, "Summary", { fields: ["Progression", "Quiz Pass Rate"] }),
    ]);
  } catch (e) {
    errors.general = e.message;
  }

  // Filtered fetches for hired applicants
  try {
    hiredApplicants = applicants.filter(a => a.fields["Stage"] === "Hired");
  } catch (e) {
    errors.hiredApplicants = e.message;
  }
  try {
    hiredThisMonth = applicants.filter(a => a.fields["Stage"] === "Hired" && a.fields["Created Time"] && new Date(a.fields["Created Time"]) >= new Date(startOfMonth));
  } catch (e) {
    errors.hiredThisMonth = e.message;
  }

  // Aggregate metrics with safe fallbacks
  const totalApplicants = applicants?.length ?? null;
  const applicantsByStage = applicants?.length ? groupAndCount(applicants, "Stage") : null;
  const totalHired = hiredApplicants?.length ?? null;
  const hiresThisMonth = hiredThisMonth?.length ?? null;
  const totalJobs = jobs?.length ?? null;
  const openJobs = jobs?.length ? jobs.filter(j => j.fields["Job Status"] === "Open").length : null;

  const totalTasks = onboardingTasks?.length ?? null;
  const completedTasks = onboardingTasks?.length ? onboardingTasks.filter(t => t.fields["Status"] === "Completed").length : null;
  const overdueTasks = onboardingTasks?.length ? onboardingTasks.filter(t => t.fields["Status"] === "Overdue").length : null;
  const taskCompletionRate = (totalTasks && completedTasks !== null) ? (totalTasks > 0 ? completedTasks / totalTasks : 0) : null;

  const onboardingProgress = summaryRecords?.length ? average(summaryRecords.map(r => r.fields["Progression"])) : null;
  const quizPassRate = summaryRecords?.length ? average(summaryRecords.map(r => r.fields["Quiz Pass Rate"])) : null;

  // Compose response
  const result = {
    totalApplicants,
    applicantsByStage,
    totalHired,
    hiresThisMonth,
    totalJobs,
    openJobs,
    taskCompletionRate,
    overdueTasks,
    onboardingProgress,
    quizPassRate,
    errors: Object.keys(errors).length ? errors : undefined,
  };

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
} 