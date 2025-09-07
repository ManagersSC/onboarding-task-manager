"use client"

import { useState, useEffect } from "react"
import { Button } from "@components/ui/button"
import { Badge } from "@components/ui/badge"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@components/ui/popover"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@components/lib/utils"
import { toast } from "sonner"

export function JobDropdown({
  value,
  onChange,
  placeholder = "Select job...",
  disabled = false,
  error = false,
  className = "",
}) {
  const [open, setOpen] = useState(false)
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(false)

  // Fetch jobs on component mount
  useEffect(() => {
    fetchJobs()
  }, [])

  const fetchJobs = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/jobs")
      if (!response.ok) {
        throw new Error("Failed to fetch jobs")
      }
      const data = await response.json()
      setJobs(data.jobs || [])
    } catch (error) {
      console.error("Error fetching jobs:", error)
      toast.error("Failed to load jobs")
    } finally {
      setLoading(false)
    }
  }

  const selectedJob = jobs.find((job) => job.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", error && "border-red-500", className)}
          disabled={disabled}
        >
          {selectedJob ? (
            <div className="flex items-center gap-2">
              <span className="truncate">{selectedJob.title}</span>
              <Badge variant="secondary" className="text-xs">
                {selectedJob.jobStatus}
              </Badge>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search jobs..." />
          <CommandList>
            <CommandEmpty>{loading ? "Loading jobs..." : "No open jobs found."}</CommandEmpty>
            <CommandGroup>
              {jobs.map((job) => (
                <CommandItem
                  key={job.id}
                  value={job.title}
                  onSelect={() => {
                    onChange(job.id)
                    setOpen(false)
                  }}
                  className="flex items-center gap-2"
                >
                  <Check className={cn("mr-2 h-4 w-4", value === job.id ? "opacity-100" : "opacity-0")} />
                  <span className="flex-1 font-medium">{job.title}</span>
                  <Badge variant="secondary" className="text-xs">
                    {job.jobStatus}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
