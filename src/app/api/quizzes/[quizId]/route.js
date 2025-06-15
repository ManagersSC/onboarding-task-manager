import { cookies } from "next/headers";
import logger from "@/lib/utils/logger";
import Airtable from "airtable";
import { unsealData } from "iron-session";
import { logAuditEvent } from "@/lib/auditLogger";
import { NextResponse } from 'next/server';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

const APPLICANTS = 'Applicants';
const ONBOARDING_QUIZZES = 'Onboarding Quizzes';
const ONBOARDING_QUIZ_ITEMS = 'Onboarding Quiz Items';
const ONBOARDING_QUIZ_SUBMISSIONS = 'Onboarding Quiz Submissions';

// async function getSessionUser() {
//   try{
//     const cookieStore = await cookies();
//     const session = cookieStore.get(process.env.SESSION_COOKIE_NAME);
//     if (!session) throw new Error("Not authenticated");
//     const user = await unsealData(session.value, { password: process.env.SESSION_PASSWORD });
//     if (!user?.email) throw new Error("No user email in session");
//     return user;
//   } catch (error) {
//     logger.error("Error getting session user:", error);
//     throw new Error("Internal server error");
//   }
// }

async function getApplicantRecord(userEmail) {
  const records = await base(APPLICANTS).select({ filterByFormula: `{Email} = '${userEmail}'`, maxRecords: 1 }).firstPage();
  if (!records.length) throw new Error("Applicant not found");
  return records[0];
}

function parseOptions(optionsRaw) {
  if (!optionsRaw) return [];
  return optionsRaw.split('<br>').map(opt => opt.trim()).filter(Boolean).map(opt => ({ text: opt, value: opt }));
}

function parseCorrectAnswer(correctRaw, questionType) {
  if (!correctRaw) return questionType === 'checkbox' ? [] : '';
  if (questionType === 'checkbox') {
    return correctRaw.split('<br>').map(ans => ans.trim()).filter(Boolean);
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
    // const filterFormula = `FIND('${quizId}', ARRAYJOIN({Quiz ID}))`;
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
        // Parse options into a clean array
        let optionsArr = [];
        if (item.fields["Options"]) {
          optionsArr = item.fields["Options"].split('&lt;br>').map(opt => opt.replace(/<[^>]+>/g, '').trim()).filter(Boolean);
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
    await getApplicantRecord(user.email); // Ensures user is an applicant
    const quizId = params.quizId;
    const body = await req.json();
    const { answers } = body; // { [questionId]: answer or [answers] }
    // Fetch quiz items (questions only)
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
      let isCorrect = false;
      if (questionType === "checkbox") {
        // Both should be arrays, compare as sets
        const userSet = new Set(Array.isArray(userAnswer) ? userAnswer : []);
        const correctSet = new Set(Array.isArray(correct) ? correct : []);
        isCorrect = userSet.size === correctSet.size && [...userSet].every(val => correctSet.has(val));
      } else {
        isCorrect = userAnswer && userAnswer.toString().trim() === correct;
      }
      if (isCorrect) {
        score += item.fields["Points"] || 1;
      }
      total += item.fields["Points"] || 1;
    }
    // Fetch quiz metadata for passing score
    const quiz = await base(ONBOARDING_QUIZZES).find(quizId);
    const passingScore = quiz.fields["Passing Score"];
    const passed = score >= passingScore;
    // Store submission
    await base(ONBOARDING_QUIZ_SUBMISSIONS).create({
      "Score": score,
      "Total Form Score": total,
      "Passed?": passed ? "Passed" : "Failed",
      "Respondent Email": user.email,
      "Applicants": [applicant.id],
      "Onboarding - Quizzes": [quizId],
      "Submission Timestamp": new Date().toISOString(),
      "Answers": JSON.stringify(answers),
    });
    return NextResponse.json({ score, total, passed });
  } catch (error) {
    logger.error("Error submitting quiz:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 