import { cookies } from "next/headers";
import logger from "@/lib/utils/logger";
import Airtable from "airtable";
import { unsealData } from "iron-session";
import { logAuditEvent } from "@/lib/auditLogger";
import { NextResponse } from 'next/server';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

const APPLICANTS = 'Applicants';
const ONBOARDING_QUIZ_SUBMISSIONS = 'Onboarding Quiz Submissions';

async function getSessionUser() {
  const cookieStore = await cookies();
  const session = cookieStore.get(process.env.SESSION_COOKIE_NAME);
  if (!session) throw new Error("Not authenticated");
  const user = await unsealData(session.value, { password: process.env.SESSION_PASSWORD });
  if (!user?.email) throw new Error("No user email in session");
  return user;
}

async function getApplicantRecord(userEmail) {
  const records = await base(APPLICANTS).select({ filterByFormula: `{Email} = '${userEmail}'`, maxRecords: 1 }).firstPage();
  if (!records.length) throw new Error("Applicant not found");
  return records[0];
}

export async function GET(req, { params }) {
  try {
    const user = await getSessionUser();
    const applicant = await getApplicantRecord(user.email);
    const quizId = params.quizId;
    // Find the user's submission for this quiz
    const submissions = await base(ONBOARDING_QUIZ_SUBMISSIONS)
      .select({
        filterByFormula: `AND(FIND('${quizId}', ARRAYJOIN({Onboarding - Quizzes})), FIND('${applicant.id}', ARRAYJOIN({Applicants})))`,
        maxRecords: 1
      })
      .firstPage();
    if (!submissions.length) return NextResponse.json({ submission: null });
    const sub = submissions[0];
    let answers = {};
    try {
      answers = sub.fields["Answers"] ? JSON.parse(sub.fields["Answers"]) : {};
    } catch (e) {
      answers = {};
    }
    return NextResponse.json({
      submission: {
        id: sub.id,
        score: sub.fields["Score"],
        total: sub.fields["Total Form Score"],
        passed: sub.fields["Passed?"] === "Passed",
        respondentEmail: sub.fields["Respondent Email"],
        submittedAt: sub.fields["Submission Timestamp"],
        answers,
      }
    });
  } catch (error) {
    logger.error("Error fetching quiz submission:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 