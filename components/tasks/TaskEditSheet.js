"use client"

import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@components/ui/button"
import { Input } from "@components/ui/input"
import { Textarea } from "@components/ui/textarea"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@components/ui/sheet"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@components/ui/form"
import { Skeleton } from "@components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@components/ui/popover"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { cn } from "@components/lib/utils"
import { toast } from "@/hooks/use-toast"

// Form validation schema
const taskFormSchema = z.object({
  title: z.string().min(1, "Task name is required"),
  description: z.string().optional(),
  type: z.string().optional(),
  week: z.string().optional(),
  day: z.string().optional(),
  folderName: z.string().optional(),
  job: z.string().optional(),
  location: z.string().optional(),
  resourceUrl: z.string().url("Must be a valid URL").or(z.string().length(0)).optional(),
})

export function TaskEditSheet({ taskId, open, onOpenChange }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [folderOpen, setFolderOpen] = useState(false)
  const [folderOptions, setFolderOptions] = useState([])
  const [loadingFolders, setLoadingFolders] = useState(false)

  // Form definition
  const form = useForm({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "",
      week: "",
      day: "",
      folderName: "",
      job: "",
      location: "",
      resourceUrl: "",
    },
  })

  // Type options
  const typeOptions = [
    { value: "Doc", label: "Document" },
    { value: "Video", label: "Video" },
    { value: "G.Drive", label: "Google Drive" },
  ]

  // Load task data when sheet opens or taskId changes
  useEffect(() => {
    if (open && taskId) {
      setLoading(true)
      setError(null)

      fetch(`/api/admin/tasks/core-tasks/${taskId}`)
        .then((res) => {
          if (!res.ok) throw new Error(res.statusText)
          return res.json()
        })
        .then(({ task }) => {
          console.log("Fetched task:", task)
          // Update form with fetched data
          form.reset({
            title: task.title || "",
            description: task.description || "",
            type: task.type || "",
            week: task.week || "",
            day: task.day || "",
            folderName: task.folderName || "",
            job: task.job || "",
            location: task.location || "",
            resourceUrl: task.resourceUrl || "",
          })
        })
        .catch((err) => {
          setError(err.message)
          toast({
            variant: "destructive",
            title: "Error loading task",
            description: err.message,
          })
        })
        .finally(() => setLoading(false))
    }
  }, [open, taskId, form])

  // Fetch folder options (simulated)
  useEffect(() => {
    if (open) {
      setLoadingFolders(true)
      // This would be a real API call in production
      setTimeout(() => {
        setFolderOptions([
          { value: "treatments-overview", label: "Treatments Overview" },
          { value: "understanding-treatment", label: "Understanding Treatment" },
          { value: "practice-operations", label: "Practice Operations" },
          { value: "using-dentally", label: "Using Dentally" },
          { value: "finance-payments", label: "Finance & Payments" },
          { value: "closing", label: "Closing" },
          { value: "new-patient-booking", label: "New Patient Booking" },
        ])
        setLoadingFolders(false)
      }, 500)
    }
  }, [open])

  // Handle form submission
  async function onSubmit(data) {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/tasks/core-tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
  
      if (!response.ok) {
        throw new Error("Failed to update task");
      }
  
      toast({
        title: "Task updated",
        description: "Task details have been saved successfully",
      });
  
      onOpenChange(false); // Close the sheet
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error updating task",
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  }
  

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{loading ? <Skeleton className="h-8 w-3/4" /> : "Task Details"}</SheetTitle>
          <SheetDescription>
            {loading ? (
              <Skeleton className="h-4 w-full" />
            ) : (
              "View and edit task details. All changes are saved automatically."
            )}
          </SheetDescription>
        </SheetHeader>

        {error ? (
          <div className="py-6 text-center">
            <p className="text-destructive">Error: {error}</p>
            <Button onClick={() => onOpenChange(false)} variant="outline" className="mt-4">
              Close
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-6">
              {/* Task ID (read-only) */}
              <div className="text-sm text-muted-foreground">
                {loading ? <Skeleton className="h-4 w-1/2" /> : <span>Task ID: {taskId}</span>}
              </div>

              {/* Task Name */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Name</FormLabel>
                    {loading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <FormControl>
                        <Input placeholder="Enter task name" {...field} />
                      </FormControl>
                    )}
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
                    {loading ? (
                      <Skeleton className="h-20 w-full" />
                    ) : (
                      <FormControl>
                        <Textarea placeholder="Task description" className="min-h-[100px]" {...field} />
                      </FormControl>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Type */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    {loading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {typeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Week */}
              <FormField
                control={form.control}
                name="week"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Week</FormLabel>
                    {loading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select week" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map((week) => (
                            <SelectItem key={week} value={week.toString()}>
                              Week {week}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Day */}
              <FormField
                control={form.control}
                name="day"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Day</FormLabel>
                    {loading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select day" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map((day) => (
                            <SelectItem key={day} value={day.toString()}>
                              Day {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Folder Name */}
              <FormField
                control={form.control}
                name="folderName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Folder Name</FormLabel>
                    {loading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <Popover open={folderOpen} onOpenChange={setFolderOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={folderOpen}
                              className="w-full justify-between"
                            >
                              {field.value
                                ? folderOptions.find((folder) => folder.value === field.value)?.label || field.value
                                : "Select folder..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="p-0" align="start" side="top">
                          <Command>
                            <CommandInput placeholder="Search folders..." />
                            <CommandList>
                              {loadingFolders ? (
                                <div className="p-4 text-center">
                                  <Skeleton className="h-5 w-full mb-2" />
                                  <Skeleton className="h-5 w-full mb-2" />
                                  <Skeleton className="h-5 w-full" />
                                </div>
                              ) : (
                                <>
                                  <CommandEmpty>
                                    <div className="flex flex-col items-center justify-center p-4 text-center">
                                      <p className="text-sm text-muted-foreground">No folder found.</p>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="mt-2"
                                        onClick={() => {
                                          // This would create a new folder in production
                                          setFolderOpen(false)
                                        }}
                                      >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Create new folder
                                      </Button>
                                    </div>
                                  </CommandEmpty>
                                  <CommandGroup>
                                    {folderOptions.map((folder) => (
                                      <CommandItem
                                        key={folder.value}
                                        value={folder.value}
                                        onSelect={(value) => {
                                          form.setValue("folderName", value)
                                          setFolderOpen(false)
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            field.value === folder.value ? "opacity-100" : "opacity-0",
                                          )}
                                        />
                                        {folder.label}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Job */}
              <FormField
                control={form.control}
                name="job"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job</FormLabel>
                    {loading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <FormControl>
                        <Input placeholder="Job role" {...field} />
                      </FormControl>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Location */}
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    {loading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <FormControl>
                        <Input placeholder="Location" {...field} />
                      </FormControl>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Resource Link */}
              <FormField
                control={form.control}
                name="resourceUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resource Link</FormLabel>
                    {loading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <FormControl>
                        <Input placeholder="https://example.com/resource" type="url" {...field} />
                      </FormControl>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <SheetFooter>
                <SheetClose asChild>
                  <Button type="button" variant="secondary" disabled={loading}>
                    Close
                  </Button>
                </SheetClose>
                <Button type="submit" disabled={loading}>
                  Save changes
                </Button>
              </SheetFooter>
            </form>
          </Form>
        )}
      </SheetContent>
    </Sheet>
  )
}
