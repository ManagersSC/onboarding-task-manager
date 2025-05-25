"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ChevronLeft, ChevronRight, Calendar, Briefcase, Mail } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card"
import { Button } from "@components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@components/ui/avatar"
import { Progress } from "@components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@components/ui/dialog"

// Demo data
const newHires = [
  {
    id: 1,
    name: "Sarah Chen",
    role: "Senior Developer",
    department: "Engineering",
    startDate: "May 15, 2023",
    progress: 75,
    avatar: "/file.svg",
    tasks: {
      completed: 9,
      total: 12,
    },
    email: "sarah.chen@example.com",
  },
  {
    id: 2,
    name: "Michael Rodriguez",
    role: "UX Designer",
    department: "Design",
    startDate: "May 22, 2023",
    progress: 40,
    avatar: "/globe.svg",
    tasks: {
      completed: 4,
      total: 10,
    },
    email: "michael.r@example.com",
  },
  {
    id: 3,
    name: "Alex Johnson",
    role: "Marketing Specialist",
    department: "Marketing",
    startDate: "June 1, 2023",
    progress: 20,
    avatar: "/next.svg",
    tasks: {
      completed: 2,
      total: 10,
    },
    email: "alex.j@example.com",
  },
  {
    id: 4,
    name: "James Wilson",
    role: "Sales Representative",
    department: "Sales",
    startDate: "June 5, 2023",
    progress: 10,
    avatar: "/vercel.svg",
    tasks: {
      completed: 1,
      total: 10,
    },
    email: "james.w@example.com",
  },
  {
    id: 5,
    name: "Emily Parker",
    role: "Financial Analyst",
    department: "Finance",
    startDate: "June 12, 2023",
    progress: 5,
    avatar: "/window.svg",
    tasks: {
      completed: 0,
      total: 8,
    },
    email: "emily.p@example.com",
  },
]

export function NewHireTracker() {
  const [selectedHire, setSelectedHire] = useState(null)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>New Hire Progress</CardTitle>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:flex sm:space-x-4 gap-4 sm:gap-0 sm:overflow-x-auto pb-2">
            {newHires.map((hire, index) => (
              <Dialog key={hire.id}>
                <DialogTrigger asChild>
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="flex-shrink-0 w-full sm:w-60 bg-card rounded-lg border p-4 cursor-pointer hover:shadow-md transition-shadow"
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setSelectedHire(hire)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={hire.avatar || "/placeholder.svg"} alt={hire.name} />
                        <AvatarFallback>
                          {hire.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium text-sm">{hire.name}</h4>
                        <p className="text-xs text-muted-foreground">{hire.role}</p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Onboarding Progress</span>
                        <span className="font-medium">{hire.progress}%</span>
                      </div>
                      <Progress value={hire.progress} className="h-2" />
                    </div>

                    <div className="mt-3 flex items-center text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 mr-1" />
                      <span>Starts: {hire.startDate}</span>
                    </div>
                  </motion.div>
                </DialogTrigger>

                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>New Hire Details</DialogTitle>
                  </DialogHeader>
                  <div className="flex items-center gap-4 py-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={hire.avatar || "/placeholder.svg"} alt={hire.name} />
                      <AvatarFallback>
                        {hire.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-lg">{hire.name}</h3>
                      <p className="text-muted-foreground">{hire.role}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center text-xs">
                          <Briefcase className="h-3 w-3 mr-1" />
                          <span>{hire.department}</span>
                        </div>
                        <div className="flex items-center text-xs">
                          <Calendar className="h-3 w-3 mr-1" />
                          <span>{hire.startDate}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Onboarding Progress</span>
                        <span className="font-medium">{hire.progress}%</span>
                      </div>
                      <Progress value={hire.progress} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {hire.tasks.completed} of {hire.tasks.total} tasks completed
                      </p>
                    </div>

                    <div className="pt-2">
                      <h4 className="text-sm font-medium mb-2">Contact Information</h4>
                      <div className="flex items-center text-sm">
                        <Mail className="h-4 w-4 mr-2" />
                        <span>{hire.email}</span>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline">View All Tasks</Button>
                      <Button>Send Welcome Email</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
