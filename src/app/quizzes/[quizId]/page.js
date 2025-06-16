import QuizClient from "@components/quiz/quiz-client"

export default async function QuizPage({ params }) {
  const p = await params;
  const quizId = p.quizId;
  return (
    <div className="container mx-auto px-4 py-8">
      <QuizClient quizId={quizId} />
    </div>
  )
}
