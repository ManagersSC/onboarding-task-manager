import { cookies } from "next/headers";
import logger from "@/lib/utils/logger";
import Airtable from "airtable";
import { unsealData } from "iron-session";
import { NextResponse } from 'next/server';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

const ONBOARDING_TASKS_LOGS = 'Onboarding Tasks Logs';
const ONBOARDING_QUIZZES = 'Onboarding Quizzes';
const ONBOARDING_QUIZ_SUBMISSIONS = 'Onboarding Quiz Submissions';
const APPLICANTS = 'Applicants';

async function getSessionUser() {
  const cookieStore = await cookies();
  const session = cookieStore.get(process.env.SESSION_COOKIE_NAME);
  if (!session) throw new Error("Not authenticated");
  const user = await unsealData(session.value, { password: process.env.SESSION_PASSWORD });
  if (!user?.email) throw new Error("No user email in session");
  return user;
}

async function getApplicantIdByEmail(userEmail) {
  const applicants = await base(APPLICANTS)
    .select({ filterByFormula: `{Email} = '${userEmail}'`, maxRecords: 1 })
    .firstPage();
  return applicants[0]?.id;
}

export async function GET(request) {
  try {
    const user = await getSessionUser();
    const applicantId = await getApplicantIdByEmail(user.email);
    if (!applicantId) {
      logger.debug(`No applicant found for email: ${user.email}`);
      return NextResponse.json({ error: "Applicant not found" }, { status: 404 });
    }
    // Fetch all logs for this applicant
    const logs = await base(ONBOARDING_TASKS_LOGS)
      .select({
        filterByFormula: `{Assigned} = '${applicantId}'`,
        fields: ['Task', 'Onboarding Quizzes'],
        pageSize: 100,
      })
      .all();
    // Only include logs that are linked to a quiz
    const quizLogs = logs.filter(log => Array.isArray(log.fields['Onboarding Quizzes']) && log.fields['Onboarding Quizzes'].length > 0);
    // Fetch quiz metadata and submission status for each
    const quizzes = await Promise.all(
      quizLogs.map(async (log) => {
        const quizId = log.fields['Onboarding Quizzes'][0];
        let quizRec = null;
        try {
          quizRec = await base(ONBOARDING_QUIZZES).find(quizId);
        } catch (e) {}
        if (!quizRec) return null;
        // Find submission for this quiz/applicant
        const submissions = await base(ONBOARDING_QUIZ_SUBMISSIONS)
          .select({
            filterByFormula: `AND(FIND('${quizId}', ARRAYJOIN({Onboarding - Quizzes})), FIND('${applicantId}', ARRAYJOIN({Applicants})))`,
            maxRecords: 1,
          })
          .firstPage();
        let status = 'not_started', score = null, passed = null, submissionId = null;
        if (submissions.length > 0) {
          status = 'completed';
          score = submissions[0].fields['Score'] || null;
          passed = submissions[0].fields['Passed?'] === 'Passed';
          submissionId = submissions[0].id;
        }
        return {
          logId: log.id,
          quizId,
          title: quizRec.fields['Quiz Title'],
          week: quizRec.fields['Week'] || null,
          status,
          score,
          passed,
          submissionId,
        };
      })
    );
    // Filter out any nulls (in case quiz metadata was missing)
    return NextResponse.json(quizzes.filter(Boolean));
  } catch (error) {
    logger.error("Error fetching user quizzes:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 