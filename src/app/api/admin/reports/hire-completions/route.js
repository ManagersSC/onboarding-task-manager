import Airtable from "airtable";

export async function GET(req) {
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    return new Response(JSON.stringify({ error: "Airtable environment variables are missing" }), { status: 500 });
  }

  try {
    const url = new URL(req.url);
    const applicantId = url.searchParams.get("applicantId") || "";
    const from = url.searchParams.get("from") || "";
    const to = url.searchParams.get("to") || "";
    const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "30", 10), 1), 100);

    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

    // Field IDs (from ATS_schema.json → Tasks table):
    // fldcOYboUu2vDASCl = 🚀 Status
    // fldo7oJ0uwiwhNzmH = 👤 Assigned Applicant
    // flddxTSDbSiHOD0a2 = Completed Date
    // fldBSR0tivzKCwIYX = 📌 Task
    // fldv9LfTsox0hlbYK = Task Type
    // fld7fsKOvSDOQrgqn = Completed By
    // flduO7hnHXoRRyiqo = Display Resource Link (lookup from Onboarding Tasks Logs)
    const F_STATUS = "fldcOYboUu2vDASCl";
    const F_APPLICANT = "fldo7oJ0uwiwhNzmH";
    const F_COMPLETED_DATE = "flddxTSDbSiHOD0a2";
    const F_TASK = "fldBSR0tivzKCwIYX";
    const F_TASK_TYPE = "fldv9LfTsox0hlbYK";
    const F_COMPLETED_BY = "fld7fsKOvSDOQrgqn";
    const F_TASK_DOCUMENT_URL = "flduO7hnHXoRRyiqo";

    // Filter: Completed status (+ optional date window). Applicant filtering is done in code.
    // Why: Airtable formulas evaluate linked-record fields as display values, not record IDs,
    // so filtering by applicant record ID in filterByFormula is unreliable.
    const parts = [`{${F_STATUS}} = 'Completed'`];
    if (from) parts.push(`IS_AFTER({${F_COMPLETED_DATE}}, DATETIME_PARSE('${from}'))`);
    if (to) parts.push(`IS_BEFORE({${F_COMPLETED_DATE}}, DATETIME_PARSE('${to}'))`);
    const filterByFormula = `AND(${parts.join(",")})`;

    const fields = [F_TASK, F_TASK_TYPE, F_APPLICANT, F_COMPLETED_BY, F_COMPLETED_DATE, F_TASK_DOCUMENT_URL];

    // Fetch a larger window than `limit` so we can filter by applicant in code without returning empty results.
    const scanLimit = applicantId ? Math.min(Math.max(limit * 10, 50), 200) : limit;

    const recordsRaw = await base("Tasks")
      .select({
        filterByFormula,
        fields,
        pageSize: Math.min(scanLimit, 100),
        sort: [{ field: F_COMPLETED_DATE, direction: "desc" }],
        returnFieldsByFieldId: true,
      })
      .all();

    const records = applicantId
      ? recordsRaw.filter((r) => Array.isArray(r?.fields?.[F_APPLICANT]) && r.fields[F_APPLICANT].includes(applicantId))
      : recordsRaw;

    // Resolve names
    const applicantIds = new Set();
    const staffIds = new Set();
    for (const r of records) {
      (r.fields[F_APPLICANT] || []).forEach((id) => applicantIds.add(id));
      (r.fields[F_COMPLETED_BY] || []).forEach((id) => staffIds.add(id));
    }

    async function getNames(table, ids) {
      if (ids.size === 0) return {};
      const list = Array.from(ids);
      const formula = list.map((id) => `RECORD_ID() = '${id}'`).join(", ");
      const out = {};
      const page = await base(table).select({ filterByFormula: `OR(${formula})`, fields: ["Name"], pageSize: list.length }).firstPage();
      for (const rec of page) out[rec.id] = rec.fields["Name"] || "Unknown";
      return out;
    }

    const applicantNameById = await getNames("Applicants", applicantIds);
    const staffNameById = await getNames("Staff", staffIds);

    const items = records.slice(0, limit).map((r) => {
      const aId = (r.fields[F_APPLICANT] || [])[0] || "";
      const sId = (r.fields[F_COMPLETED_BY] || [])[0] || "";
      const title = r.fields[F_TASK] || "";
      const completedAt = r.fields[F_COMPLETED_DATE] || null;
      const completedByName = sId ? (staffNameById[sId] || "-") : "-";
      const completedDateLabel = completedAt
        ? (() => {
            try {
              // Completed Date is a date-only field in Airtable; render it as a clean date label.
              return new Date(completedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
            } catch {
              return String(completedAt);
            }
          })()
        : "—";
      const rawUrl = r.fields[F_TASK_DOCUMENT_URL];
      const taskDocumentUrl = Array.isArray(rawUrl) && rawUrl.length > 0 ? (rawUrl[0] || "") : (typeof rawUrl === "string" ? rawUrl : "");
      return {
        id: r.id,
        title,
        taskType: r.fields[F_TASK_TYPE] || "",
        applicantId: aId,
        applicantName: applicantNameById[aId] || "",
        completedById: sId,
        completedByName,
        completedAt,
        taskDocumentUrl: taskDocumentUrl || "",
        // A professional, presentable per-record message for UI display
        message: `Task "${title}" was completed by ${completedByName} on ${completedDateLabel}.`,
      };
    });

    return new Response(JSON.stringify({ items }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

