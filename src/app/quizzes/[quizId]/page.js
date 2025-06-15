"use client"

import { useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@components/ui/button"
import { Progress } from "@components/ui/progress" 
import { InfoDisplay } from "@components/quiz/info-display"
import { QuestionDisplay } from "@components/quiz/question-display"
import { Check, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react"

const quizData = [
  {
    type: "info",
    title: "Welcome to the Knowledge Challenge!",
    text: "Test your general knowledge with a mix of multiple-choice and single-choice questions. Take your time and good luck!",
  },
  {
    type: "question",
    id: "q1",
    questionText: "Which of these celestial bodies are classified as planets in our solar system?",
    points: 10,
    questionType: "checkbox",
    options: [
      { text: "Mars", value: "mars" },
      { text: "Pluto (Dwarf Planet)", value: "pluto" },
      { text: "Jupiter", value: "jupiter" },
      { text: "Europa (Moon of Jupiter)", value: "europa" },
    ],
    correctAnswers: ["mars", "jupiter"],
  },
  {
    type: "question",
    id: "q2",
    questionText: "What is the capital city of France?",
    points: 5,
    questionType: "radio",
    options: [
      { text: "London, UK", value: "london" },
      { text: "Berlin, Germany", value: "berlin" },
      { text: "Paris, France", value: "paris" },
      { text: "Madrid, Spain", value: "madrid" },
    ],
    correctAnswer: "paris",
  },
  {
    type: "info",
    title: "Quiz Complete!",
    text: "Congratulations on finishing the challenge! You can review your answers or proceed to see your results.",
  },
]

export default function QuizPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [direction, setDirection] = useState(0) // 0 for initial, 1 for next, -1 for prev

  const handleAnswerChange = (questionId, answer) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }))
  }

  const paginate = (newDirection) => {
    setDirection(newDirection)
    setCurrentStep((prevStep) => prevStep + newDirection)
  }

  const handleFinishQuiz = () => {
    // Implement actual finish logic, e.g., navigate to results page or show score
    alert("Quiz finished! Answers: \n" + JSON.stringify(answers, null, 2))
  }

  const currentBlock = quizData[currentStep]
  const progress = ((currentStep + 1) / quizData.length) * 100

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

  const quizTitle = quizData.find((block) => block.type === "info")?.title || "General Knowledge Quiz"

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
              Step {currentStep + 1} of {quizData.length}
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
            {currentBlock.type === "info" ? (
              <InfoDisplay title={currentBlock.title} text={currentBlock.text} />
            ) : (
              <QuestionDisplay
                question={currentBlock}
                onAnswerChange={(answer) => handleAnswerChange(currentBlock.id, answer)}
                currentAnswer={answers[currentBlock.id]}
              />
            )}
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
          {currentStep === quizData.length - 1 ? (
            <Button
              onClick={handleFinishQuiz}
              className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 sm:px-6 sm:py-3 text-base sm:text-lg"
              aria-label="Finish quiz"
            >
              Finish Quiz
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
