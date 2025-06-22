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
  const sessionCookie = cookieStore.get("session")?.value;
  if (!sessionCookie) throw new Error("Not authenticated");
  const user = await unsealData(sessionCookie, { password: process.env.SESSION_SECRET });
  if (!user?.userEmail) throw new Error("No user email in session");
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
    const applicantId = await getApplicantIdByEmail(user.userEmail);
    if (!applicantId) {
      logger.debug(`No applicant found for email: ${user.userEmail}`);
      return NextResponse.json({ error: "Applicant not found" }, { status: 404 });
    }

    // Fetch all logs for this applicant with more fields for better integration
    const logs = await base(ONBOARDING_TASKS_LOGS)
      .select({
        filterByFormula: `FIND('${user.userEmail}', ARRAYJOIN({Assigned}))`,
        fields: [
          'Task', 
          'Onboarding Quizzes',
          'Display Title',
          'Display Desc',
          'Display Resource Link',
          'Task Week Number',
          'Display Type',
          'Status',
          'Last Status Change Time'
        ],
        pageSize: 100,
      })
      .all();

    logger.debug("--- RAW TASK LOGS received in /api/user/quizzes ---");
    logs.forEach(log => {
      logger.debug({
        logId: log.id,
        title: log.fields['Display Title'],
        onboardingQuizzesField: log.fields['Onboarding Quizzes'],
        isFieldArray: Array.isArray(log.fields['Onboarding Quizzes']),
        fieldLength: Array.isArray(log.fields['Onboarding Quizzes']) ? log.fields['Onboarding Quizzes'].length : 'N/A',
      });
    });
    logger.debug("--- END RAW TASK LOGS ---");

    // Only include logs that are linked to a quiz
    const quizLogs = logs.filter(log => 
      Array.isArray(log.fields['Onboarding Quizzes']) && 
      log.fields['Onboarding Quizzes'].length > 0
    );

    // Fetch quiz metadata and submission status for each
    const quizzes = await Promise.all(
      quizLogs.map(async (log) => {
        const onboardingQuizzes = log.fields['Onboarding Quizzes'];
        if (!Array.isArray(onboardingQuizzes) || onboardingQuizzes.length === 0) return null;
        
        const quizId = onboardingQuizzes[0];
        let quizRec = null;
        
        try {
          quizRec = await base(ONBOARDING_QUIZZES).find(quizId);
        } catch (e) {
          logger.error(`Error fetching quiz ${quizId}:`, e);
        }
        
        if (!quizRec || !quizRec.fields) return null;

        // Find submission for this quiz/applicant
        const submissions = await base(ONBOARDING_QUIZ_SUBMISSIONS)
          .select({
            filterByFormula: `AND(FIND('${quizId}', ARRAYJOIN({Onboarding - Quizzes})), FIND('${applicantId}', ARRAYJOIN({Applicants})))`,
            maxRecords: 1,
          })
          .firstPage();

        let status = 'not_started', score = null, passed = null, submissionId = null;
        let completed = false;
        
        if (submissions.length > 0) {
          status = 'completed';
          completed = true;
          score = submissions[0].fields['Score'] || null;
          passed = submissions[0].fields['Passed?'] === 'Passed';
          submissionId = submissions[0].id;
        }

        // Create a quiz URL - you might need to adjust this path
        const quizUrl = `/quizzes/${quizId}`;
        
        return {
          // Core quiz data
          logId: log.id,
          quizId,
          title: log.fields['Display Title'] || quizRec.fields['Quiz Title'] || 'Quiz',
          description: completed 
            ? `Quiz completed! ${score ? `Score: ${score}%` : '✅'}` 
            : (log.fields['Display Desc'] || "Weekly Quiz - Special Task!"),
          
          // Status and completion
          status,
          completed,
          overdue: log.fields['Status'] === 'Overdue',
          
          // URLs and navigation
          resourceUrl: log.fields['Display Resource Link'] || quizUrl,
          
          // Timing and organization
          week: log.fields['Task Week Number'] || quizRec.fields['Week'] || null,
          lastStatusChange: log.fields['Last Status Change Time'] || null,
          
          // Quiz-specific data
          score,
          passed,
          submissionId,
          
          // UI flags
          isQuiz: true,
          type: 'Quiz',
          folder: null, // Quizzes don't use folders in UI
          
          // Debug info
          originalLogStatus: log.fields['Status'],
          displayType: log.fields['Display Type']
        };
      })
    );

    // Filter out any nulls and log results
    const validQuizzes = quizzes.filter(Boolean);
    
    logger.debug(`Found ${validQuizzes.length} quizzes for user ${user.userEmail}`, {
      quizIds: validQuizzes.map(q => q.quizId),
      statuses: validQuizzes.map(q => ({ id: q.quizId, status: q.status, completed: q.completed }))
    });

    return NextResponse.json(validQuizzes);
    
  } catch (error) {
    logger.error("Error fetching user quizzes:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}