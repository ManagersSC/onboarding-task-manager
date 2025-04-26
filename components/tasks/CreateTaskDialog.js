"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@components/ui/dialog"
import { CreateTaskForm } from "./CreateTaskForm"

export function CreateTaskDialog({
  trigger,
  title = "Create New Task",
  description = "Add a new task for users to complete during onboarding.",
  open,
  onOpenChange
}) {
  const [isOpen, setIsOpen] = useState(false)

  const handleSuccess = (data) => {
    if (onOpenChange) onOpenChange(false)
  }

  const handleCancel = () => {
    if (onOpenChange) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <CreateTaskForm onSuccess={handleSuccess} onCancel={handleCancel} />
      </DialogContent>
    </Dialog>
  )
}
