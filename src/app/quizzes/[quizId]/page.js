"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@components/ui/button"
import { Progress } from "@components/ui/progress"
import { InfoDisplay } from "@components/quiz/info-display"
import { QuestionDisplay } from "@components/quiz/question-display"
import { Check, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react"

export default function QuizPage() {
  const params = useParams()
  const router = useRouter()
  const quizId = params.quizId
  const [quiz, setQuiz] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [direction, setDirection] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [submission, setSubmission] = useState(null)

  useEffect(() => {
    async function fetchQuiz() {
      setLoading(true)
      setError(null)
      try {
        const [quizRes, submissionRes] = await Promise.all([
          fetch(`/api/quizzes/${quizId}`),
          fetch(`/api/quizzes/${quizId}/submission`),
        ])
        if (!quizRes.ok) throw new Error("Failed to load quiz")
        const quizData = await quizRes.json()
        setQuiz(quizData)
        if (submissionRes.ok) {
          const subData = await submissionRes.json()
          if (subData.submission) {
            setSubmission(subData.submission)
            setAnswers(subData.submission.answers || {})
          }
        }
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    if (quizId) fetchQuiz()
  }, [quizId])

  const handleAnswerChange = (questionId, answer) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }))
  }

  const paginate = (newDirection) => {
    setDirection(newDirection)
    setCurrentStep((prevStep) => prevStep + newDirection)
  }

  const handleFinishQuiz = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/quizzes/${quizId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      })
      if (!res.ok) throw new Error("Failed to submit quiz")
      const data = await res.json()
      setResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="flex flex-col items-center justify-center min-h-screen text-muted-foreground">Loading quiz...</div>
  }
  if (error) {
    return <div className="flex flex-col items-center justify-center min-h-screen text-destructive">{error}</div>
  }
  if (!quiz || !Array.isArray(quiz.items) || quiz.items.length === 0) {
    return <div className="flex flex-col items-center justify-center min-h-screen text-destructive">Quiz not found or has no items.</div>
  }

  const items = quiz.items
  const currentBlock = items[currentStep]
  if (!currentBlock || (typeof currentBlock !== 'object')) {
    return <div className="flex flex-col items-center justify-center min-h-screen text-destructive">Quiz data is malformed (missing block).</div>
  }
  const progress = ((currentStep + 1) / items.length) * 100
  const quizTitle = quiz.title || "Quiz"

  // If quiz is already submitted, show result
  if (result || submission) {
    const showResult = result || submission
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground">
        <header className="py-4 px-4 sm:px-6 border-b sticky top-0 bg-background/90 backdrop-blur-md z-20">
          <div className="mx-auto flex flex-col sm:flex-row items-center justify-between w-full max-w-6xl gap-3 sm:gap-4">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <Link
                href="/dashboard"
                className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors whitespace-nowrap"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
              <h1 className="text-lg sm:text-xl font-semibold text-foreground truncate" title={quizTitle}>
                {quizTitle}
              </h1>
            </div>
          </div>
        </header>
        <main className="flex-grow flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 w-full overflow-x-hidden">
          <div className="max-w-xl w-full text-center border rounded-lg p-8 mt-8">
            <h2 className="text-2xl font-bold mb-4">Quiz Results</h2>
            <p className="mb-2">Score: <span className="font-semibold">{showResult.score} / {showResult.total || quiz.passingScore}</span></p>
            <p className="mb-2">Status: <span className={showResult.passed ? "text-green-600" : "text-red-600"}>{showResult.passed ? "Passed" : "Failed"}</span></p>
            {showResult.submittedAt && <p className="mb-2">Submitted: {new Date(showResult.submittedAt).toLocaleString()}</p>}
            <Button asChild className="mt-4">
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </div>
        </main>
      </div>
    )
  }

  const variants = {
    enter: (direction) => ({
      x: direction > 0 ? 500 : -500,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: {
        x: { type: "spring", stiffness: 260, damping: 30 },
        opacity: { duration: 0.3, ease: "easeIn" },
      },
    },
    exit: (direction) => ({
      x: direction < 0 ? 500 : -500,
      opacity: 0,
      transition: {
        x: { type: "spring", stiffness: 260, damping: 30 },
        opacity: { duration: 0.2, ease: "easeOut" },
      },
    }),
  }

  let blockContent = null
  try {
    if (currentBlock.type === "info") {
      blockContent = <InfoDisplay title={currentBlock.title || "Info"} text={currentBlock.text || ""} />
    } else if (currentBlock.type === "question") {
      if (!currentBlock.id || !currentBlock.questionText) {
        throw new Error("Quiz question is missing required fields.")
      }
      blockContent = (
        <QuestionDisplay
          question={currentBlock}
          onAnswerChange={(answer) => handleAnswerChange(currentBlock.id, answer)}
          currentAnswer={answers[currentBlock.id]}
        />
      )
    } else {
      blockContent = <div className="text-destructive">Unknown quiz block type.</div>
    }
  } catch (err) {
    blockContent = <div className="text-destructive">Quiz rendering error: {err.message}</div>
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="py-4 px-4 sm:px-6 border-b sticky top-0 bg-background/90 backdrop-blur-md z-20">
        <div className="mx-auto flex flex-col sm:flex-row items-center justify-between w-full max-w-6xl gap-3 sm:gap-4">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <Link
              href="/dashboard"
              className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors whitespace-nowrap"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
            <h1 className="text-lg sm:text-xl font-semibold text-foreground truncate" title={quizTitle}>
              {quizTitle}
            </h1>
          </div>
          <div className="w-full sm:w-auto sm:min-w-[200px] md:min-w-[250px]">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center mt-1">
              Step {currentStep + 1} of {items.length}
            </p>
          </div>
        </div>
      </header>
      <main className="flex-grow flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 w-full overflow-x-hidden">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentStep}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            className="w-full max-w-3xl"
          >
            {blockContent}
          </motion.div>
        </AnimatePresence>
      </main>
      <footer className="py-4 px-4 sm:px-6 border-t bg-background/90 backdrop-blur-md sticky bottom-0 z-20">
        <div className="mx-auto flex items-center justify-between w-full max-w-3xl">
          <Button
            variant="outline"
            onClick={() => paginate(-1)}
            disabled={currentStep === 0}
            className="px-5 py-2.5 sm:px-6 sm:py-3 text-base sm:text-lg"
            aria-label="Previous question"
          >
            <ChevronLeft className="h-5 w-5 mr-1 sm:mr-2" />
            Previous
          </Button>
          {currentStep === items.length - 1 ? (
            <Button
              onClick={handleFinishQuiz}
              className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 sm:px-6 sm:py-3 text-base sm:text-lg"
              aria-label="Finish quiz"
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Finish Quiz"}
              <Check className="h-5 w-5 ml-1 sm:ml-2" />
            </Button>
          ) : (
            <Button
              onClick={() => paginate(1)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 sm:px-6 sm:py-3 text-base sm:text-lg"
              aria-label="Next question"
            >
              Next
              <ChevronRight className="h-5 w-5 ml-1 sm:ml-2" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  )
}
