"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { Button } from "@components/ui/button"
import { CardFooter } from "@components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@components/ui/alert"
import { ArrowLeft, XCircle, Loader2 } from "lucide-react"
import InfoItem from "./info-item"
import QuestionItem from "./question-item"
import QuizResults from "./quiz-results"
import QuizSkeleton from "./quiz-skeleton"

export default function QuizClient({ quizId }) {
  const [quizData, setQuizData] = useState(null)
  const [userAnswers, setUserAnswers] = useState({})
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [results, setResults] = useState(null)
  const [isLoading, setIsLoading] = useState(true) // Loading for data fetch
  const [error, setError] = useState(null)

  // Fetch quiz data and submission data on mount
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      setError(null)
      try {
        const [quizRes, submissionRes] = await Promise.all([
          fetch(`/api/quizzes/${quizId}`),
          fetch(`/api/quizzes/${quizId}/submission`),
        ])
        let quizData = null
        let submissionData = { submission: null }
        if (quizRes.ok) {
          quizData = await quizRes.json()
        } else {
          throw new Error("Failed to fetch quiz data")
        }
        if (submissionRes.ok) {
          submissionData = await submissionRes.json()
        }
        setQuizData(quizData)
        if (submissionData && submissionData.submission) {
          setUserAnswers(submissionData.submission.answers || {})
          setResults({
            score: submissionData.submission.score,
            total: submissionData.submission.total,
            passed: submissionData.submission.passed,
          })
          setIsSubmitted(true)
        } else {
          // Initialize answers for new quiz attempt
          const initialAnswers = {}
          quizData?.items?.forEach((item) => {
            if (item.type === "question") {
              initialAnswers[item.id] = item.questionType === "checkbox" ? [] : null
            }
          })
          setUserAnswers(initialAnswers)
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [quizId])

  useEffect(() => {
    console.log("QuizClient quizData:", quizData)
    console.log("QuizClient isSubmitted:", isSubmitted)
    console.log("QuizClient userAnswers:", userAnswers)
    console.log("QuizClient results:", results)
  }, [quizData, isSubmitted, userAnswers, results])

  const handleAnswerChange = (questionId, answer) => {
    setUserAnswers((prevAnswers) => ({
      ...prevAnswers,
      [questionId]: answer,
    }))
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/quizzes/${quizId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: userAnswers }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to submit quiz")
      }
      const submissionResult = await response.json()
      setResults(submissionResult)
      setIsSubmitted(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <QuizSkeleton />
  }

  if (error) {
    return <div className="text-center text-destructive py-12">{error}</div>
  }

  if (!quizData) {
    return <QuizSkeleton />
  }

  if (!quizData.items || !Array.isArray(quizData.items) || quizData.items.length === 0) {
    return <div className="text-center text-destructive py-12">No quiz items found for this quiz.</div>
  }

  const questionItems = quizData.items?.filter((item) => item.type === "question") || []
  const allQuestionsAnswered = questionItems.every((q) => {
    const answer = userAnswers[q.id]
    if (q.questionType === "checkbox") {
      return Array.isArray(answer) && answer.length > 0
    }
    return answer !== null && answer !== undefined && answer !== ""
  })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back to Dashboard</span>
          </Link>
        </Button>
        <h1 className="text-3xl font-bold ml-2 tracking-tight">{quizData.title}</h1>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isSubmitted && results && (
        <QuizResults results={results} quizTitle={quizData.title} passingScore={quizData.passingScore} />
      )}

      <div className="space-y-8">
        {quizData.items
          ?.sort((a, b) => a.order - b.order)
          .map((item, index) => (
            <motion.div
              key={item.id || `info-${index}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              {item.type === "info" ? (
                <InfoItem item={item} />
              ) : (
                <QuestionItem
                  question={item}
                  onAnswerChange={handleAnswerChange}
                  userAnswer={userAnswers[item.id]}
                  isSubmitted={isSubmitted}
                  correctAnswer={isSubmitted ? item.correctAnswer : null} // Only pass correct answer if submitted
                />
              )}
            </motion.div>
          ))}
      </div>

      {!isSubmitted && (
        <CardFooter className="mt-8 p-0">
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !allQuestionsAnswered}
            className="w-full md:w-auto text-lg py-6 px-8"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Quiz"
            )}
          </Button>
        </CardFooter>
      )}
      {isSubmitted && (
        <div className="mt-8 flex justify-center">
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      )}

      {/* Show passing score if available */}
      {quizData.passingScore !== undefined && quizData.passingScore !== null && (
        <div className="text-sm text-muted-foreground mb-2">
          Passing Score: {quizData.passingScore}%
        </div>
      )}
    </motion.div>
  )
}
