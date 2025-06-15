import { cookies } from "next/headers";
import logger from "@/lib/utils/logger";
import Airtable from "airtable";
import { unsealData } from "iron-session";
import { logAuditEvent } from "@/lib/auditLogger";
import { NextResponse } from 'next/server';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

const APPLICANTS = 'Applicants';
const ONBOARDING_QUIZ_SUBMISSIONS = 'Onboarding Quiz Submissions';

async function getApplicantRecord(userEmail) {
  logger.info("Getting applicant record for user email:", userEmail);
  const records = await base(APPLICANTS).select({ filterByFormula: `{Email} = '${userEmail}'`, maxRecords: 1 }).firstPage();
  if (!records.length) throw new Error("Applicant not found");
  return records[0];
}

export async function GET(req, { params }) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session")?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const user = await unsealData(sessionCookie, { password: process.env.SESSION_SECRET });
    const applicant = await getApplicantRecord(user.userEmail);
    const p = await params;
    const quizId = p.quizId;
    // Find the user's submission for this quiz
    const submissions = await base(ONBOARDING_QUIZ_SUBMISSIONS)
      .select({
        filterByFormula: `AND(FIND('${quizId}', ARRAYJOIN({Onboarding - Quizzes})), FIND('${applicant.id}', ARRAYJOIN({Applicants})))`,
        maxRecords: 1
      })
      .firstPage();
    if (!submissions.length) return NextResponse.json({ submission: null });
    const sub = submissions[0];
    if (!sub.fields) {
      logger.error("Quiz submission missing fields", { sub });
      return NextResponse.json({ error: "Submission data malformed" }, { status: 500 });
    }
    let answers = {};
    try {
      answers = sub.fields["Answers"] ? JSON.parse(sub.fields["Answers"]) : {};
    } catch (e) {
      logger.error("Error parsing quiz submission answers", { sub, error: e });
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
    logger.error("[API SUBMISSION] Error fetching quiz submission:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session")?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const user = await unsealData(sessionCookie, { password: process.env.SESSION_SECRET });
    const applicant = await getApplicantRecord(user.userEmail);
    const p = await params;
    const quizId = p.quizId;
    // Find the user's submission for this quiz
    const submissions = await base(ONBOARDING_QUIZ_SUBMISSIONS)
      .select({
        filterByFormula: `AND(FIND('${quizId}', ARRAYJOIN({Onboarding - Quizzes})), FIND('${applicant.id}', ARRAYJOIN({Applicants})))`,
        maxRecords: 1
      })
      .firstPage();
    if (!submissions.length) return NextResponse.json({ submission: null });
    const sub = submissions[0];
    if (!sub.fields) {
      logger.error("Quiz submission missing fields", { sub });
      return NextResponse.json({ error: "Submission data malformed" }, { status: 500 });
    }
    let answers = {};
    try {
      answers = sub.fields["Answers"] ? JSON.parse(sub.fields["Answers"]) : {};
    } catch (e) {
      logger.error("Error parsing quiz submission answers", { sub, error: e });
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
    logger.error("[API SUBMISSION] Error fetching quiz submission:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 