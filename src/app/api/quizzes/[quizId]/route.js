import { cookies } from "next/headers";
import logger from "@/lib/utils/logger";
import Airtable from "airtable";
import { unsealData } from "iron-session";
import { logAuditEvent } from "@/lib/auditLogger";
import { NextResponse } from 'next/server';
import { createNotification } from "@/lib/notifications";
import { NOTIFICATION_TYPES } from "@/lib/notification-types";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

const APPLICANTS = 'Applicants';
const ONBOARDING_QUIZZES = 'Onboarding Quizzes';
const ONBOARDING_QUIZ_ITEMS = 'Onboarding Quiz Items';
const ONBOARDING_QUIZ_SUBMISSIONS = 'Onboarding Quiz Submissions';

async function getApplicantRecord(userEmail) {
  const records = await base(APPLICANTS).select({ filterByFormula: `{Email} = '${userEmail}'`, maxRecords: 1 }).firstPage();
  if (!records.length) throw new Error("Applicant not found");
  return records[0];
}

function parseBrSeparatedString(str) {
  if (!str) return [];
  // First, decode common HTML entities, then split by the standard <br> tag.
  const decodedStr = str.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  return decodedStr.split(/<br>/i).map(opt => opt.trim()).filter(Boolean);
}

function parseCorrectAnswer(correctRaw, questionType) {
  if (!correctRaw) return questionType === 'checkbox' ? [] : '';
  if (questionType === 'checkbox') {
    return parseBrSeparatedString(correctRaw);
  }
  return correctRaw.trim();
}

export async function GET(req, { params }) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session")?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const user = await unsealData(sessionCookie, { password: process.env.SESSION_SECRET });
    await getApplicantRecord(user.userEmail);
    const p = await params;
    const quizId = p.quizId;

    // Fetch quiz metadata
    let quizRec;
    try {
      quizRec = await base(ONBOARDING_QUIZZES).find(quizId);
    } catch (e) {
      logger.error(`Quiz not found for id: ${quizId}`, e);
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }
    if (!quizRec || !quizRec.fields) {
      logger.error(`Quiz record missing fields for id: ${quizId}`, { quizRec });
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }
    const quiz = quizRec.fields;

    // Fetch all quiz items (info and questions)
    let items = [];
    const filterFormula = `{Quiz ID} = '${quizId}'`;
    
    logger.info(`[DEBUG] Fetching quiz items for quizId: ${quizId} with formula: ${filterFormula}`);
    try {
      items = await base(ONBOARDING_QUIZ_ITEMS)
        .select({ filterByFormula: filterFormula, sort: [{field: 'Order', direction: 'asc'}] })
        .all();
      logger.info(`[DEBUG] Raw quiz items from Airtable:`, items.map(i => ({id: i.id, fields: i.fields})));
    } catch (e) {
      logger.error(`[DEBUG] Error fetching quiz items for quizId: ${quizId}`, e);
    }
    const parsedItems = Array.isArray(items) ? items.map(item => {
      if (!item.fields) {
        logger.error("Quiz item missing fields", { item });
        return null;
      }
      const type = item.fields["Type"] === "Information" ? "info" : "question";
      if (type === "info") {
        return {
          type: "info",
          text: item.fields["Content"] || "",
          order: item.fields["Order"] || 0,
        };
      } else {
        const questionType = (item.fields["Q.Type"] || "radio").toLowerCase();
        if (!item.id || !item.fields["Content"]) {
          logger.error("Quiz question missing id or content", { item });
          return null;
        }
        
        let optionsArr = [];
        if (item.fields["Options"]) {
          optionsArr = parseBrSeparatedString(item.fields["Options"]);
        }
        return {
          type: "question",
          id: item.id,
          questionText: item.fields["Content"] || "",
          questionType,
          options: optionsArr,
          points: item.fields["Points"] || 0,
          order: item.fields["Order"] || 0,
          correctAnswer: parseCorrectAnswer(item.fields["Correct Answer"], questionType),
        };
      }
    }).filter(Boolean) : [];
    if (parsedItems.length === 0) {
      logger.warn(`[DEBUG] No quiz items found after parsing for quizId: ${quizId}`);
    }

    const responseObj = {
      quizId,
      title: quiz["Quiz Title"],
      passingScore: quiz["Passing Score"],
      items: parsedItems,
    };
    logger.warn(`[DEBUG] API response for quizId ${quizId}: ${JSON.stringify(responseObj, null, 2)}`);
    return NextResponse.json(responseObj);
  } catch (error) {
    logger.error("Error fetching quiz details:", error);
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
    const body = await req.json();
    const { answers } = body;
    
    const items = await base(ONBOARDING_QUIZ_ITEMS)
      .select({ filterByFormula: `AND(FIND('${quizId}', ARRAYJOIN({Quiz ID})), {Type} = 'Question')` })
      .all();
    let score = 0;
    let total = 0;
    for (const item of items) {
      const questionType = (item.fields["Q.Type"] || "radio").toLowerCase();
      const qid = item.id;
      const correct = parseCorrectAnswer(item.fields["Correct Answer"], questionType);
      const userAnswer = answers[qid];
      const maxPoints = item.fields["Points"] || 1;
      
      let questionScore = 0;
      
      if (questionType === "checkbox") {
        const userAnswers = new Set(Array.isArray(userAnswer) ? userAnswer : []);
        const correctAnswers = new Set(Array.isArray(correct) ? correct : []);
        
        if (correctAnswers.size > 0) {
          const pointsPerOption = maxPoints / correctAnswers.size;
          let correctSelections = 0;
          let incorrectSelections = 0;

          for (const selected of userAnswers) {
            if (correctAnswers.has(selected)) {
              correctSelections++;
            } else {
              incorrectSelections++;
            }
          }
          
          questionScore = (correctSelections * pointsPerOption) - (incorrectSelections * pointsPerOption);
          questionScore = Math.max(0, Math.round(questionScore * 100) / 100);
        }
      } else {
        const isCorrect = userAnswer && userAnswer.toString().trim() === correct.toString().trim();
        questionScore = isCorrect ? maxPoints : 0;
      }
      
      score += questionScore;
      total += maxPoints;
    }
    
    const quiz = await base(ONBOARDING_QUIZZES).find(quizId);
    let passingScoreRaw = quiz.fields["Passing Score"] ?? 0;
    let passingScore = Number(passingScoreRaw);
    if (typeof passingScoreRaw === 'string' && passingScoreRaw.endsWith('%')) {
      passingScore = Number(passingScoreRaw.replace('%', '').trim());
    }
    if (passingScore <= 1) {
      passingScore = passingScore * 100;
    }
    const percent = total > 0 ? (score / total) * 100 : 0;
    logger.warn(`[QUIZ SUBMIT DEBUG] percent: ${percent}, passingScore: ${passingScore}, raw: ${passingScoreRaw}`);
    const passed = percent >= passingScore;
    
    await base(ONBOARDING_QUIZ_SUBMISSIONS).create({
      "Score": score,
      "Total Form Score": total,
      "Passed?": passed ? "Passed" : "Failed",
      "Respondent Email": user.userEmail,
      "Applicants": [applicant.id],
      "Onboarding - Quizzes": [quizId],
      "Submission Timestamp": new Date().toISOString(),
      "Answers": JSON.stringify(answers),
    });

    try {
      const staffRecords = await base('Staff').select({ filterByFormula: `{IsAdmin}`, maxRecords: 20 }).firstPage();
      for (const admin of staffRecords) {
        await createNotification({
          title: `Quiz Completed: ${quiz.fields["Quiz Title"] || quizId}`,
          body: `Applicant ${applicant.fields["Name"] || user.userEmail} has completed the quiz '${quiz.fields["Quiz Title"] || quizId}' with a score of ${score}/${total} (${Math.round(percent)}%).`,
          type: NOTIFICATION_TYPES.QUIZ_COMPLETION,
          severity: "Info",
          recipientId: admin.id,
          actionUrl: `/admin/quizzes/${quizId}/submissions`,
          source: "System"
        });
      }
    } catch (err) {
      logger.error("Failed to notify admins of quiz completion:", err);
    }

    try {
      await logAuditEvent({
        eventType: "Quiz Completed",
        eventStatus: passed ? "Success" : "Failure",
        userRole: user.userRole || "Applicant",
        userName: applicant.fields["Name"] || user.userEmail,
        userIdentifier: user.userEmail,
        detailedMessage: `Applicant ${applicant.fields["Name"] || user.userEmail} (${user.userEmail}) completed quiz '${quiz.fields["Quiz Title"] || quizId}' (ID: ${quizId}) with score ${score}/${total} (${Math.round(percent)}%). Pass: ${passed}.`,
        request: req
      });
    } catch (err) {
      logger.error("Failed to log audit event for quiz completion:", err);
    }

    return NextResponse.json({ score, total, passed });
  } catch (error) {
    logger.error("Error submitting quiz:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}