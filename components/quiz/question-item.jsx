"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@components/ui/card"
import { RadioGroup, RadioGroupItem } from "@components/ui/radio-group"
import { Checkbox } from "@components/ui/checkbox"
import { Label } from "@components/ui/label"
import { CheckCircle, XCircle, HelpCircle } from "lucide-react"
import { sanitizeHtml } from "@/lib/utils/sanitize"

export default function QuestionItem({ question, onAnswerChange, userAnswer, isSubmitted, correctAnswer }) {
  const { id, questionText, questionType, options, points } = question

  // Ensure userAnswer is always an array for checkboxes
  const safeUserAnswer = questionType === "checkbox" 
    ? (Array.isArray(userAnswer) ? userAnswer : [])
    : userAnswer

  const getOptionState = (optionValue) => {
    if (!isSubmitted) return "default"

    const isSelected = questionType === "checkbox" 
      ? safeUserAnswer.includes(optionValue)
      : safeUserAnswer === optionValue

    const isCorrect = questionType === "checkbox" 
      ? (Array.isArray(correctAnswer) && correctAnswer.includes(optionValue))
      : correctAnswer === optionValue

    if (isSelected && isCorrect) return "correctSelected"
    if (isSelected && !isCorrect) return "incorrectSelected"
    if (!isSelected && isCorrect) return "correctUnselected"
    return "default"
  }

  const optionClasses = {
    default: "border-muted-foreground/20 hover:bg-muted/50",
    correctSelected: "border-success bg-success-muted ring-2 ring-success",
    incorrectSelected: "border-error bg-error-muted ring-2 ring-error",
    correctUnselected: "border-success bg-success-muted",
  }

  const IconComponent = ({ state }) => {
    if (!isSubmitted) return null
    if (state === "correctSelected") return <CheckCircle className="h-5 w-5 text-success ml-auto" />
    if (state === "incorrectSelected") return <XCircle className="h-5 w-5 text-error ml-auto" />
    if (state === "correctUnselected") return <CheckCircle className="h-5 w-5 text-success ml-auto" />
    return null
  }

  const handleCheckboxChange = (option, checked) => {
    if (isSubmitted) return
    
    const currentAnswers = Array.isArray(safeUserAnswer) ? safeUserAnswer : []
    const newAnswers = checked
      ? [...currentAnswers, option]
      : currentAnswers.filter((ans) => ans !== option)
    
    onAnswerChange(id, newAnswers)
  }

  return (
    <Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="text-xl flex items-start">
          <HelpCircle className="h-6 w-6 text-primary mr-3 mt-1 flex-shrink-0" />
          <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(questionText) }} />
        </CardTitle>
        <CardDescription>
          {points} point{points === 1 ? "" : "s"}
          {questionType === "checkbox" && " (Select all that apply)"}
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
                    <span className="flex-grow" dangerouslySetInnerHTML={{ __html: sanitizeHtml(option) }} />
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
                      onCheckedChange={(checked) => handleCheckboxChange(option, checked)}
                      disabled={isSubmitted}
                      className="mr-3 flex-shrink-0"
                    />
                    <span className="flex-grow" dangerouslySetInnerHTML={{ __html: sanitizeHtml(option) }} />
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
