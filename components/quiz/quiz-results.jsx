"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@components/ui/card"
import { Progress } from "@components/ui/progress"
import { CheckCircle, XCircle, Award, TrendingUp } from "lucide-react"

export default function QuizResults({ results, quizTitle, passingScore }) {
  const { score, total, passed } = results
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0

  // Fix passingScore display: if <= 1, treat as decimal and convert to percent; else, display as-is
  let passingScoreDisplay = passingScore;
  if (typeof passingScore === 'number') {
    passingScoreDisplay = passingScore <= 1 ? Math.round(passingScore * 100) : Math.round(passingScore);
  }

  const statusIcon = passed ? (
    <CheckCircle className="h-12 w-12 text-green-500" />
  ) : (
    <XCircle className="h-12 w-12 text-red-500" />
  )
  const statusText = passed ? "Congratulations! You Passed!" : "Keep Trying! You Did Not Pass."
  const statusColor = passed ? "text-green-500" : "text-red-500"

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="mb-8"
    >
      <Card
        className="shadow-xl border-t-4"
        style={{ borderColor: passed ? "var(--color-green-500)" : "var(--color-red-500)" }}
      >
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">{statusIcon}</div>
          <CardTitle className={`text-3xl font-bold ${statusColor}`}>{statusText}</CardTitle>
          <CardDescription className="text-lg">Results for: {quizTitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <div className="text-5xl font-semibold">
            {score} <span className="text-3xl text-muted-foreground">/ {total}</span>
          </div>
          <div className="w-full max-w-md mx-auto">
            <div className="flex justify-between text-sm text-muted-foreground mb-1">
              <span>Your Score: {percentage}%</span>
              {passingScore !== undefined && <span>Passing Score: {passingScoreDisplay}%</span>}
            </div>
            <Progress value={percentage} className="h-3" indicatorClassName={passed ? "bg-green-500" : "bg-red-500"} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 text-left">
            <div className="flex items-center p-4 bg-muted/50 rounded-lg">
              <Award className="h-6 w-6 text-yellow-500 mr-3" />
              <div>
                <p className="font-semibold">Points Earned</p>
                <p className="text-muted-foreground">
                  {score} out of {total} possible points.
                </p>
              </div>
            </div>
            <div className="flex items-center p-4 bg-muted/50 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-500 mr-3" />
              <div>
                <p className="font-semibold">Percentage</p>
                <p className="text-muted-foreground">{percentage}% achieved.</p>
              </div>
            </div>
          </div>

          {passingScore !== undefined && (
            <p className="text-sm text-muted-foreground mt-4">
              The passing threshold for this quiz is {passingScoreDisplay}%.
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
