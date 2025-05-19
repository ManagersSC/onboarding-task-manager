"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { z } from "zod"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { CalendarIcon, Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { cn } from "@components/lib/utils"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@components/ui/form"
import { Popover, PopoverContent, PopoverTrigger } from "@components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@components/ui/command"
import { Input } from "@components/ui/input"
import { Button } from "@components/ui/button"
import { Textarea } from "@components/ui/textarea"
import { Calendar } from "@components/ui/calendar"

const taskSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters" }),
  description: z.string().optional(),
  assignTo: z.string({ required_error: "Please select a staff member" }),
  urgency: z.string().min(1, "Please select urgency"),
  dueDate: z.date({ required_error: "Please select a due date" }),
  createdBy: z.string(),
})

const urgencyOptions = [
  { value: "very-high", label: "Very High" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
  { value: "very-low", label: "Very Low" },
]

export function NewTaskModal({ open, onOpenChange, onTaskCreate }) {
  const [staff, setStaff] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState({ id: '', name: '' })
  const [urgencyOpen, setUrgencyOpen] = useState(false)
  const [dateOpen, setDateOpen] = useState(false)

  const form = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      assignTo: "",
      urgency: "",
      dueDate: undefined,
      createdBy: "",
    },
  })

  useEffect(() => {
    const fetchStaff = async () => {
      setIsLoading(true)
      try {
        const response = await fetch("/api/admin/staff")
        const data = await response.json()
        setStaff(data)
      } catch (error) {
        console.error("Failed to fetch staff:", error)
      } finally {
        setIsLoading(false)
      }
    }

    const fetchCurrentUser = async () => {
      try {
        const res = await fetch("/api/admin/dashboard/current-user")
        if (!res.ok) throw new Error("Not authenticated")
        const data = await res.json()
        setCurrentUser({ id: data.id, name: data.name })
        form.setValue("createdBy", data.name)
      } catch (error) {
        setCurrentUser({ id: '', name: '' })
        form.setValue("createdBy", "")
      }
    }

    if (open) {
      fetchStaff()
      fetchCurrentUser()
    }
  }, [open])

  function onSubmit(values) {
    onTaskCreate({ ...values, createdById: currentUser.id })
    form.reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>Fill in the details below to create a new task.</DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter task title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter task description" className="min-h-[100px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assignTo"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Assign To</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn("justify-between", !field.value && "text-muted-foreground")}
                          >
                            {field.value
                              ? staff.find((person) => person.id === field.value)?.name || "Select staff"
                              : "Select staff"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="p-0">
                        <Command>
                          <CommandInput placeholder="Search staff..." />
                          <CommandList>
                            <CommandEmpty>{isLoading ? "Loading..." : "No staff found."}</CommandEmpty>
                            <CommandGroup>
                              {isLoading ? (
                                <div className="flex items-center justify-center p-4">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                </div>
                              ) : (
                                staff.map((person) => (
                                  <CommandItem
                                    key={person.id}
                                    value={person.id}
                                    onSelect={() => {
                                      form.setValue("assignTo", person.id)
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        person.id === field.value ? "opacity-100" : "opacity-0",
                                      )}
                                    />
                                    {person.name}
                                  </CommandItem>
                                ))
                              )}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Controller
                control={form.control}
                name="urgency"
                render={({ field }) => (
                  <div>
                    <FormLabel>Urgency</FormLabel>
                    <Popover open={urgencyOpen} onOpenChange={setUrgencyOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between"
                        >
                          {field.value
                            ? urgencyOptions.find((o) => o.value === field.value)?.label
                            : "Select urgency"}
                          <ChevronsUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0 w-full">
                        {urgencyOptions.map((option) => (
                          <div
                            key={option.value}
                            className={`flex items-center px-3 py-2 cursor-pointer hover:bg-muted ${
                              field.value === option.value ? "bg-muted" : ""
                            }`}
                            onClick={() => {
                              field.onChange(option.value)
                              setUrgencyOpen(false)
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                field.value === option.value ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            {option.label}
                          </div>
                        ))}
                      </PopoverContent>
                    </Popover>
                    {form.formState.errors.urgency && (
                      <p className="text-red-500 text-xs mt-1">
                        {form.formState.errors.urgency.message}
                      </p>
                    )}
                  </div>
                )}
              />

              <Controller
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <div>
                    <FormLabel>Due Date</FormLabel>
                    <Popover open={dateOpen} onOpenChange={setDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            field.onChange(date)
                            setDateOpen(false)
                          }}
                          initialFocus
                          className="rounded-md border"
                        />
                      </PopoverContent>
                    </Popover>
                    {form.formState.errors.dueDate && (
                      <p className="text-red-500 text-xs mt-1">
                        {form.formState.errors.dueDate.message}
                      </p>
                    )}
                  </div>
                )}
              />

              <FormField
                control={form.control}
                name="createdBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Created By</FormLabel>
                    <FormControl>
                      <Input {...field} disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Task</Button>
              </DialogFooter>
            </form>
          </Form>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
