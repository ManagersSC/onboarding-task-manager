"use client"

import { useState } from "react"
import { Button } from "@components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/ui/dialog"
import { Label } from "@components/ui/label"
import { RadioGroup, RadioGroupItem } from "@components/ui/radio-group"

const LOCATIONS = [
  { label: "Finchley", value: "Finchley Branch" },
  { label: "St Johns Wood", value: "St Johns Wood Branch" },
  { label: "Online", value: "Online" },
]

export default function LocationDialog({ open, onOpenChange, onConfirm }) {
  const [value, setValue] = useState("")

  const confirm = () => {
    if (!value) return
    onConfirm?.(value)
    setValue("")
    onOpenChange?.(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setValue("")
        onOpenChange?.(v)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select interview location</DialogTitle>
          <DialogDescription>This step requires a location. Choose one to continue.</DialogDescription>
        </DialogHeader>
        <RadioGroup value={value} onValueChange={setValue} className="grid gap-3">
          {LOCATIONS.map((opt) => (
            <div key={opt.value} className="flex items-center gap-2 rounded-md border p-3 cursor-pointer">
              <RadioGroupItem id={opt.value} value={opt.value} />
              <Label htmlFor={opt.value} className="cursor-pointer">
                {opt.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange?.(false)} className="cursor-pointer">
            Cancel
          </Button>
          <Button onClick={confirm} disabled={!value} className="cursor-pointer">
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
