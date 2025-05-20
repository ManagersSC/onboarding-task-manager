"use client"

import { Popover, PopoverContent, PopoverTrigger } from "@components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@components/ui/command"
import { Button } from "@components/ui/button"
import { Check, ChevronsUpDown } from "lucide-react"
import { toast } from "sonner"

export default function TestToast() {
  const showDefaultToast = () => {
    toast(
      <div>
        <div className="font-semibold">Default Toast</div>
        <div className="text-sm opacity-80">This is a default toast notification</div>
      </div>
    )
  }

  const showSuccessToast = () => {
    toast.success(
      <div>
        <div className="font-semibold">Success Toast</div>
        <div className="text-sm opacity-80">Your action was completed successfully</div>
      </div>
    )
  }

  const showErrorToast = () => {
    toast.error(
      <div>
        <div className="font-semibold">Error Toast</div>
        <div className="text-sm opacity-80">There was an error processing your request</div>
      </div>
    )
  }

  return (
    <div className="flex gap-2 mt-4">
      <h1>Test Page</h1>
      <Button onClick={showDefaultToast} variant="outline">
        Default Toast
      </Button>
      <Button onClick={showSuccessToast} variant="outline" className="bg-green-500 text-white hover:bg-green-600">
        Success Toast
      </Button>
      <Button onClick={showErrorToast} variant="outline" className="bg-red-500 text-white hover:bg-red-600">
        Error Toast
      </Button>
    </div>
  )
}