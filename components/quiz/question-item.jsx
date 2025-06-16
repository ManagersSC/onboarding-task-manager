"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@components/ui/card"
import { RadioGroup, RadioGroupItem } from "@components/ui/radio-group"
import { Checkbox } from "@components/ui/checkbox"
import { Label } from "@components/ui/label"
import { CheckCircle, XCircle, HelpCircle } from "lucide-react"

export default function QuestionItem({ question, onAnswerChange, userAnswer, isSubmitted, correctAnswer }) {
  const { id, questionText, questionType, options, points } = question

  const getOptionState = (optionValue) => {
    if (!isSubmitted) return "default"

    const isSelected = questionType === "checkbox" ? userAnswer?.includes(optionValue) : userAnswer === optionValue

    const isCorrect = questionType === "checkbox" ? correctAnswer?.includes(optionValue) : correctAnswer === optionValue

    if (isSelected && isCorrect) return "correctSelected"
    if (isSelected && !isCorrect) return "incorrectSelected"
    if (!isSelected && isCorrect) return "correctUnselected" // Highlight correct answer even if not selected by user
    return "default"
  }

  const optionClasses = {
    default: "border-muted-foreground/20 hover:bg-muted/50",
    correctSelected: "border-green-500 bg-green-500/10 ring-2 ring-green-500",
    incorrectSelected: "border-red-500 bg-red-500/10 ring-2 ring-red-500",
    correctUnselected: "border-green-500 bg-green-500/10",
  }

  const IconComponent = ({ state }) => {
    if (!isSubmitted) return null
    if (state === "correctSelected") return <CheckCircle className="h-5 w-5 text-green-500 ml-auto" />
    if (state === "incorrectSelected") return <XCircle className="h-5 w-5 text-red-500 ml-auto" />
    if (state === "correctUnselected") return <CheckCircle className="h-5 w-5 text-green-500 ml-auto" />
    return null
  }

  return (
    <Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="text-xl flex items-start">
          <HelpCircle className="h-6 w-6 text-primary mr-3 mt-1 flex-shrink-0" />
          <span dangerouslySetInnerHTML={{ __html: questionText }} />
        </CardTitle>
        <CardDescription>
          {points} point{points === 1 ? "" : "s"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {questionType === "radio" && (
          <RadioGroup
            value={userAnswer || ""}
            onValueChange={(value) => !isSubmitted && onAnswerChange(id, value)}
            disabled={isSubmitted}
            className="space-y-3"
          >
            {options.map((option, index) => {
              const optionState = getOptionState(option)
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Label
                    htmlFor={`${id}-${index}`}
                    className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all duration-200 ease-in-out ${optionClasses[optionState]} ${isSubmitted ? "cursor-default" : "hover:shadow-lg"}`}
                  >
                    <RadioGroupItem value={option} id={`${id}-${index}`} className="mr-3 flex-shrink-0" />
                    <span className="flex-grow" dangerouslySetInnerHTML={{ __html: option }} />
                    <IconComponent state={optionState} />
                  </Label>
                </motion.div>
              )
            })}
          </RadioGroup>
        )}
        {questionType === "checkbox" && (
          <div className="space-y-3">
            {options.map((option, index) => {
              const isChecked = userAnswer?.includes(option)
              const optionState = getOptionState(option)
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Label
                    htmlFor={`${id}-${index}`}
                    className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all duration-200 ease-in-out ${optionClasses[optionState]} ${isSubmitted ? "cursor-default" : "hover:shadow-lg"}`}
                  >
                    <Checkbox
                      id={`${id}-${index}`}
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        if (isSubmitted) return
                        const currentAnswers = userAnswer || []
                        const newAnswers = checked
                          ? [...currentAnswers, option]
                          : currentAnswers.filter((ans) => ans !== option)
                        onAnswerChange(id, newAnswers)
                      }}
                      disabled={isSubmitted}
                      className="mr-3 flex-shrink-0"
                    />
                    <span className="flex-grow" dangerouslySetInnerHTML={{ __html: option }} />
                    <IconComponent state={optionState} />
                  </Label>
                </motion.div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
