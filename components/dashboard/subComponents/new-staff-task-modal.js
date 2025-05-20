"use client"

import { useState, useEffect } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format, parse } from "date-fns"
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@components/ui/form"
import { Popover, PopoverContent, PopoverTrigger } from "@components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@components/ui/command"
import { Input } from "@components/ui/input"
import { Button } from "@components/ui/button"
import { Textarea } from "@components/ui/textarea"
import { CustomCalendar } from "@components/dashboard/subComponents/custom-calendar"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@components/ui/select"

const taskSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters" }),
  description: z.string().optional(),
  assignTo: z.string({ required_error: "Please select a staff member" }),
  urgency: z.string().min(1, "Please select urgency"),
  dueDate: z.string().min(1, "Please select a due date").regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  createdBy: z.string(),
})

const urgencyOptions = [
  { value: "Very High", label: "Very High" },
  { value: "High", label: "High" },
  { value: "Medium", label: "Medium" },
  { value: "Low", label: "Low" },
  { value: "Very Low", label: "Very Low" },
]

export function NewTaskModal({ open, onOpenChange, onTaskCreate }) {
  const [staff, setStaff] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState({ id: "", name: "" })
  const [fetchUserError, setFetchUserError] = useState("")
  const [urgencyOpen, setUrgencyOpen] = useState(false)
  const [dateOpen, setDateOpen] = useState(false)

  const form = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      assignTo: "",
      urgency: "",
      dueDate: "",
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
        setFetchUserError("")
        const res = await fetch("/api/admin/dashboard/current-user")
        if (!res.ok) throw new Error("Not authenticated. Please log in again.")
        const data = await res.json()
        if (!data.id || !data.name) throw new Error("User session invalid. Please log in again.")
        setCurrentUser({ id: data.id, name: data.name })
        form.setValue("createdBy", data.name, { shouldDirty: false })
      } catch (error) {
        setCurrentUser({ id: "", name: "" })
        form.setValue("createdBy", "", { shouldDirty: false })
        setFetchUserError(error.message || "Failed to fetch current user.")
      }
    }

    if (open) {
      fetchStaff()
      fetchCurrentUser()
    }
  }, [open])

  function onSubmit(values) {
    const payload = {
      ...values,
      dueDate: values.dueDate,
      createdById: currentUser.id,
    }
    onTaskCreate(payload)
    form.reset({
      title: "",
      description: "",
      assignTo: "",
      urgency: "",
      dueDate: "",
      createdBy: currentUser.name,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>Fill in the details below to create a new task.</DialogDescription>
        </DialogHeader>

        {fetchUserError && (
          <div className="mb-4 p-2 bg-red-100 text-red-700 rounded text-sm">
            {fetchUserError}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            {/* Task Title */}
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

            {/* Description */}
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

            {/* Assign To (Staff) */}
            <FormField
              control={form.control}
              name="assignTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign To</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select staff" />
                      </SelectTrigger>
                      <SelectContent>
                        {staff.length === 0 ? (
                          <div className="px-3 py-2 text-muted-foreground text-sm">
                            {isLoading ? "Loading..." : "No staff found"}
                          </div>
                        ) : (
                          staff.map((person) => (
                            <SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Urgency */}
            <FormField
              control={form.control}
              name="urgency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Urgency</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select urgency" />
                      </SelectTrigger>
                      <SelectContent>
                        {urgencyOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Due Date */}
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date</FormLabel>
                  <FormControl>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value
                            ? format(parse(field.value, 'yyyy-MM-dd', new Date()), "PPP")
                            : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="flex w-auto flex-col space-y-2 p-2 pointer-events-auto z-50">
                        <div className="rounded-md border">
                          <CustomCalendar
                            selected={field.value ? parse(field.value, 'yyyy-MM-dd', new Date()) : undefined}
                            onSelect={(date) => {
                              if (date) {
                                // Store as YYYY-MM-DD string in local time
                                const localStr = format(date, 'yyyy-MM-dd')
                                field.onChange(localStr)
                              }
                            }}
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Created By (disabled) */}
            <FormField
              control={form.control}
              name="createdBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Created By</FormLabel>
                  <FormControl>
                    <Input value={form.watch("createdBy") || currentUser.name || ""} disabled readOnly />
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
      </DialogContent>
    </Dialog>
  )
}
