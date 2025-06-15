"use client"

import { motion } from "framer-motion"
import { RadioGroup, RadioGroupItem } from "@components/ui/radio-group" 
import { Checkbox } from "@components/ui/checkbox" 
import { Label } from "@components/ui/label" 
import { Badge } from "@components/ui/badge" 

const defaultQuestion = {
  id: "default",
  questionText: "Default question: What is your favorite color?",
  points: 0,
  questionType: "radio",
  options: [
    { text: "Red", value: "red" },
    { text: "Blue", value: "blue" },
    { text: "Green", value: "green" },
  ],
}

export function QuestionDisplay({ question = defaultQuestion, onAnswerChange, currentAnswer }) {
  const handleCheckboxChange = (checked, optionValue) => {
    const currentAnswers = Array.isArray(currentAnswer) ? [...currentAnswer] : []
    if (checked) {
      onAnswerChange([...currentAnswers, optionValue])
    } else {
      onAnswerChange(currentAnswers.filter((val) => val !== optionValue))
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      transition: {
        staggerChildren: 0.05,
        staggerDirection: -1,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 25, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 120, damping: 15 } },
    exit: { y: -25, opacity: 0, transition: { type: "spring", stiffness: 100, damping: 15 } },
  }

  return (
    <div className="w-full py-8" role="group" aria-labelledby={`question-title-${question.id}`}>
      <div className="mb-6 sm:mb-8 text-center">
        <h2
          id={`question-title-${question.id}`}
          className="text-2xl sm:text-3xl lg:text-4xl font-semibold mb-3 text-foreground"
        >
          {question.questionText}
        </h2>
        <Badge variant="secondary" className="text-xs sm:text-sm font-medium py-1 px-3">
          {question.points} {question.points === 1 ? "Point" : "Points"}
        </Badge>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="space-y-3 sm:space-y-4 max-w-xl mx-auto"
      >
        {question.questionType === "radio" ? (
          <RadioGroup
            onValueChange={onAnswerChange}
            value={typeof currentAnswer === "string" ? currentAnswer : ""}
            className="space-y-3 sm:space-y-4"
            aria-label="Choose one answer"
          >
            {question.options.map((option) => {
              const isSelected = currentAnswer === option.value
              const uniqueId = `q-${question.id}-opt-${option.value}`
              return (
                <motion.div
                  key={option.value}
                  variants={itemVariants}
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                >
                  <Label
                    htmlFor={uniqueId}
                    className={`flex items-center p-4 sm:p-5 border rounded-lg cursor-pointer transition-all duration-200 ease-in-out text-left text-sm sm:text-base
                      ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-transparent ring-2 ring-primary ring-offset-2 ring-offset-background dark:ring-offset-card"
                          : "bg-card hover:bg-accent hover:text-accent-foreground border-border"
                      }`}
                  >
                    <RadioGroupItem
                      value={option.value}
                      id={uniqueId}
                      className="mr-3 sm:mr-4 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0"
                      aria-describedby={`option-text-${uniqueId}`}
                    />
                    <span id={`option-text-${uniqueId}`} className="flex-grow">
                      {option.text}
                    </span>
                  </Label>
                </motion.div>
              )
            })}
          </RadioGroup>
        ) : (
          question.options.map((option) => {
            const isSelected = Array.isArray(currentAnswer) && currentAnswer.includes(option.value)
            const uniqueId = `q-${question.id}-opt-${option.value}`
            return (
              <motion.div
                key={option.value}
                variants={itemVariants}
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
              >
                <Label
                  htmlFor={uniqueId}
                  className={`flex items-center p-4 sm:p-5 border rounded-lg cursor-pointer transition-all duration-200 ease-in-out text-left text-sm sm:text-base
                    ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-transparent ring-2 ring-primary ring-offset-2 ring-offset-background dark:ring-offset-card"
                        : "bg-card hover:bg-accent hover:text-accent-foreground border-border"
                    }`}
                >
                  <Checkbox
                    id={uniqueId}
                    checked={isSelected}
                    onCheckedChange={(checked) => handleCheckboxChange(Boolean(checked), option.value)}
                    className="mr-3 sm:mr-4 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0"
                    aria-describedby={`option-text-${uniqueId}`}
                  />
                  <span id={`option-text-${uniqueId}`} className="flex-grow">
                    {option.text}
                  </span>
                </Label>
              </motion.div>
            )
          })
        )}
      </motion.div>
    </div>
  )
}
