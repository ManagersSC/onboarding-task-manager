"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { ChevronLeft, ChevronRight, Calendar, Briefcase, Mail, Play, Clock } from "lucide-react"
import { toast } from "sonner"

import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card"
import { Button } from "@components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@components/ui/avatar"
import { Progress } from "@components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@components/ui/dialog"
import { Input } from "@components/ui/input"
import { Label } from "@components/ui/label"

export function NewHireTracker() {
  const [newHires, setNewHires] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedHire, setSelectedHire] = useState(null)
  const [startDateModalOpen, setStartDateModalOpen] = useState(false)
  const [selectedHireForStartDate, setSelectedHireForStartDate] = useState(null)
  const [startDate, setStartDate] = useState("")
  const [settingStartDate, setSettingStartDate] = useState(false)

  // Fetch new hires data
  useEffect(() => {
    const fetchNewHires = async () => {
      try {
        const response = await fetch('/api/admin/dashboard/new-hires')
        if (!response.ok) {
          throw new Error('Failed to fetch new hires')
        }
        const data = await response.json()
        setNewHires(data.newHires || [])
      } catch (error) {
        console.error('Error fetching new hires:', error)
        toast.error("Failed to load new hire data")
      } finally {
        setLoading(false)
      }
    }

    fetchNewHires()
  }, [])

  // Handle start date setting
  const handleSetStartDate = async () => {
    if (!selectedHireForStartDate || !startDate) return

    setSettingStartDate(true)
    try {
      const response = await fetch(`/api/admin/dashboard/new-hires/${selectedHireForStartDate.id}/start-onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          onboardingStartDate: startDate,
          triggerAutomation: true
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to set start date')
      }

      const result = await response.json()
      
      // Update local state
      setNewHires(prev => prev.map(hire => 
        hire.id === selectedHireForStartDate.id 
          ? { 
              ...hire, 
              onboardingStartDate: startDate,
              onboardingStarted: true,
              onboardingInitiationFlow: true
            }
          : hire
      ))

      toast.success(`Onboarding started for ${selectedHireForStartDate.name}`)

      setStartDateModalOpen(false)
      setSelectedHireForStartDate(null)
      setStartDate("")
    } catch (error) {
      console.error('Error setting start date:', error)
      toast.error(error.message || "Failed to set onboarding start date")
    } finally {
      setSettingStartDate(false)
    }
  }

  // Open start date modal
  const openStartDateModal = (hire) => {
    setSelectedHireForStartDate(hire)
    setStartDate("")
    setStartDateModalOpen(true)
  }

  if (loading) {
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
                <Button variant="outline" size="icon" className="h-8 w-8" disabled>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" disabled>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading new hires...</div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

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
          {newHires.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No active new hires found</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:flex sm:space-x-4 gap-4 sm:gap-0 sm:overflow-x-auto pb-2 custom-scrollbar">
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

                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3 mr-1" />
                          <span>
                            {hire.onboardingStartDate 
                              ? `Started: ${new Date(hire.onboardingStartDate).toLocaleDateString()}`
                              : "Not started"
                            }
                          </span>
                        </div>
                        {!hire.onboardingStarted && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-6 px-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation()
                              openStartDateModal(hire)
                            }}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Start
                          </Button>
                        )}
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
                            <span>
                              {hire.onboardingStartDate 
                                ? new Date(hire.onboardingStartDate).toLocaleDateString()
                                : "Not started"
                              }
                            </span>
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
                        {!hire.onboardingStarted && (
                          <Button 
                            onClick={() => openStartDateModal(hire)}
                          >
                            Start Onboarding
                          </Button>
                        )}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Start Date Modal */}
      <Dialog open={startDateModalOpen} onOpenChange={setStartDateModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Set Onboarding Start Date</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="mt-1"
              />
            </div>
            {selectedHireForStartDate && (
              <div className="text-sm text-muted-foreground">
                <p>This will start onboarding for <strong>{selectedHireForStartDate.name}</strong></p>
                <p>Tasks will be automatically assigned via automation.</p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setStartDateModalOpen(false)}
                disabled={settingStartDate}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSetStartDate}
                disabled={!startDate || settingStartDate}
              >
                {settingStartDate ? "Starting..." : "Start Onboarding"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
