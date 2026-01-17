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
    const F_STATUS = "fldcOYboUu2vDASCl";
    const F_APPLICANT = "fldo7oJ0uwiwhNzmH";
    const F_COMPLETED_DATE = "flddxTSDbSiHOD0a2";
    const F_TASK = "fldBSR0tivzKCwIYX";
    const F_TASK_TYPE = "fldv9LfTsox0hlbYK";
    const F_COMPLETED_BY = "fld7fsKOvSDOQrgqn";

    // Filter: Completed status (+ optional date window). Applicant filtering is done in code.
    // Why: Airtable formulas evaluate linked-record fields as display values, not record IDs,
    // so filtering by applicant record ID in filterByFormula is unreliable.
    const parts = [`{${F_STATUS}} = 'Completed'`];
    if (from) parts.push(`IS_AFTER({${F_COMPLETED_DATE}}, DATETIME_PARSE('${from}'))`);
    if (to) parts.push(`IS_BEFORE({${F_COMPLETED_DATE}}, DATETIME_PARSE('${to}'))`);
    const filterByFormula = `AND(${parts.join(",")})`;

    const fields = [F_TASK, F_TASK_TYPE, F_APPLICANT, F_COMPLETED_BY, F_COMPLETED_DATE];

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d97e23f0-6cbf-4e5b-b880-d53a90811734',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'hire-history-pre',hypothesisId:'H1',location:'reports/hire-completions:GET:params',message:'Incoming query params',data:{applicantId,from,to,limit,filterByFormula,fields},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d97e23f0-6cbf-4e5b-b880-d53a90811734',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A-B-C',location:'reports/hire-completions:GET:beforeQuery',message:'Building Airtable query',data:{applicantId,from,to,limit,filterByFormula,fields},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

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

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d97e23f0-6cbf-4e5b-b880-d53a90811734',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'hire-history-pre',hypothesisId:'H2',location:'reports/hire-completions:GET:afterQuery',message:'Airtable query returned',data:{count:records.length,sample:records.slice(0,2).map(r=>({id:r.id,task:(r.fields&&r.fields[F_TASK])||'',applicantFieldRaw:r.fields&&r.fields[F_APPLICANT],completedByRaw:r.fields&&r.fields[F_COMPLETED_BY],completedDate:r.fields&&r.fields[F_COMPLETED_DATE]}))},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d97e23f0-6cbf-4e5b-b880-d53a90811734',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'hire-history-pre',hypothesisId:'H2',location:'reports/hire-completions:GET:afterFilter',message:'Filtered by applicant in code',data:{applicantId,recordsRawCount:recordsRaw.length,recordsFilteredCount:records.length,scanLimit},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d97e23f0-6cbf-4e5b-b880-d53a90811734',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A-B',location:'reports/hire-completions:GET:afterQuery',message:'Airtable result',data:{count:records.length,sample:records.slice(0,3).map(r=>({id:r.id,task:r.fields["📌 Task"]||"",type:r.fields["Task Type"]||"",applicant:(r.fields["👤 Assigned Applicant"]||[])[0]||"",completedDate:r.fields["Completed Date"]||null}))},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    // If nothing returned, run relaxed diagnostics to pinpoint where the filter fails
    if (records.length === 0) {
      const diagA = await base("Tasks").select({
        filterByFormula: applicantId ? `{${F_STATUS}} = 'Completed'` : "{Id}",
        fields: [F_TASK,F_TASK_TYPE,F_STATUS,F_APPLICANT,F_COMPLETED_DATE],
        pageSize: 10,
        sort: [{ field: F_COMPLETED_DATE, direction: "desc" }],
        returnFieldsByFieldId: true,
      }).all().catch(() => []);
      const diagB = await base("Tasks").select({
        filterByFormula: applicantId
          ? `{${F_STATUS}} = 'Completed'`
          : `{${F_STATUS}} = 'Completed'`,
        fields: [F_TASK,F_TASK_TYPE,F_STATUS,F_APPLICANT,F_COMPLETED_DATE],
        pageSize: 10,
        sort: [{ field: F_COMPLETED_DATE, direction: "desc" }],
        returnFieldsByFieldId: true,
      }).all().catch(() => []);
      const diagC = await base("Tasks").select({
        filterByFormula: `{${F_STATUS}} = 'Completed'`,
        fields: [F_TASK,F_TASK_TYPE,F_STATUS,F_APPLICANT,F_COMPLETED_DATE],
        pageSize: 10,
        sort: [{ field: F_COMPLETED_DATE, direction: "desc" }],
        returnFieldsByFieldId: true,
      }).all().catch(() => []);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d97e23f0-6cbf-4e5b-b880-d53a90811734',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        sessionId:'debug-session',runId:'pre-fix',hypothesisId:'DREL',
        location:'reports/hire-completions:GET:diagnostics',
        message:'Relaxed query diagnostics',
        data:{
          diagA_count:Array.isArray(diagA)?diagA.length:0,
          diagA_sample:(diagA||[]).slice(0,3).map(r=>({id:r.id,title:r.fields[F_TASK]||"",status:r.fields[F_STATUS]||"",completedDate:r.fields[F_COMPLETED_DATE]||null})),
          diagB_count:Array.isArray(diagB)?diagB.length:0,
          diagB_sample:(diagB||[]).slice(0,3).map(r=>({id:r.id,title:r.fields[F_TASK]||"",status:r.fields[F_STATUS]||"",completedDate:r.fields[F_COMPLETED_DATE]||null})),
          diagC_count:Array.isArray(diagC)?diagC.length:0,
          diagC_sample:(diagC||[]).slice(0,3).map(r=>({id:r.id,title:r.fields[F_TASK]||"",status:r.fields[F_STATUS]||"",completedDate:r.fields[F_COMPLETED_DATE]||null}))
        },timestamp:Date.now()
      })}).catch(()=>{});
      // #endregion
    }

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

    const items = records.map((r) => {
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
      return {
        id: r.id,
        title,
        taskType: r.fields[F_TASK_TYPE] || "",
        applicantId: aId,
        applicantName: applicantNameById[aId] || "",
        completedById: sId,
        completedByName,
        completedAt,
        // A professional, presentable per-record message for UI display
        message: `Task "${title}" was completed by ${completedByName} on ${completedDateLabel}.`,
      };
    });

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d97e23f0-6cbf-4e5b-b880-d53a90811734',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'hire-history-pre',hypothesisId:'H3',location:'reports/hire-completions:GET:mapped',message:'Mapped response items',data:{count:items.length,sample:items.slice(0,2).map(it=>({id:it.id,applicantId:it.applicantId,completedByName:it.completedByName,completedAt:it.completedAt,message:it.message}))},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d97e23f0-6cbf-4e5b-b880-d53a90811734',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'C-D',location:'reports/hire-completions:GET:mapped',message:'Mapped items',data:{count:items.length,sample:items.slice(0,3)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    return new Response(JSON.stringify({ items }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d97e23f0-6cbf-4e5b-b880-d53a90811734',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'hire-history-pre',hypothesisId:'HERR',location:'reports/hire-completions:GET:catch',message:'Endpoint threw',data:{error:String(e&&e.message||e)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d97e23f0-6cbf-4e5b-b880-d53a90811734',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'E',location:'reports/hire-completions:GET:error',message:'Endpoint error',data:{error:String(e&&e.message||e)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

