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
    const user = await getSessionUser();
    await getApplicantRecord(user.email); // Ensures user is an applicant
    const quizId = params.quizId;
    // Fetch quiz metadata
    const quizRec = await base(ONBOARDING_QUIZZES).find(quizId);
    if (!quizRec) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    const quiz = quizRec.fields;
    // Fetch all quiz items (info and questions)
    const items = await base(ONBOARDING_QUIZ_ITEMS)
      .select({ filterByFormula: `FIND('${quizId}', ARRAYJOIN({Quiz ID}))`, sort: [{field: 'Order', direction: 'asc'}] })
      .all();
    const parsedItems = items.map(item => {
      const type = item.fields["Type"] === "Information" ? "info" : "question";
      if (type === "info") {
        return {
          type: "info",
          title: item.fields["Content"] || "Information",
          text: item.fields["Content"] || "",
          order: item.fields["Order"] || 0,
        };
      } else {
        const questionType = (item.fields["Q.Type"] || "radio").toLowerCase();
        return {
          type: "question",
          id: item.id,
          questionText: item.fields["Content"] || "",
          questionType,
          options: parseOptions(item.fields["Options"]),
          points: item.fields["Points"] || 0,
          order: item.fields["Order"] || 0,
          correctAnswer: parseCorrectAnswer(item.fields["Correct Answer"], questionType),
        };
      }
    });
    return NextResponse.json({
      quizId,
      title: quiz["Quiz Title"],
      passingScore: quiz["Passing Score"],
      items: parsedItems,
    });
  } catch (error) {
    logger.error("Error fetching quiz details:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const user = await getSessionUser();
    const applicant = await getApplicantRecord(user.email);
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