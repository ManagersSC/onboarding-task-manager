"use client"

import { useState, useEffect } from "react"
import { Button } from "@components/ui/button"
import { Input } from "@components/ui/input"
import { Label } from "@components/ui/label"
import { Badge } from "@components/ui/badge"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/ui/dialog"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { cn } from "@components/lib/utils"
import { generateColorFromString } from "@lib/utils/colour-hash"
import { useTheme } from "@components/theme-provider"
import { toast } from "sonner"

export function FolderDropdown({
  value,
  onChange,
  placeholder = "Select folder...",
  disabled = false,
  error = false,
  className = "",
}) {
  const [open, setOpen] = useState(false)
  const [folders, setFolders] = useState([])
  const [loading, setLoading] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [creating, setCreating] = useState(false)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  // Fetch folders on component mount
  useEffect(() => {
    fetchFolders()
  }, [])

  const fetchFolders = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/folders")
      if (!response.ok) {
        throw new Error("Failed to fetch folders")
      }
      const data = await response.json()
      setFolders(data.folders || [])
    } catch (error) {
      console.error("Error fetching folders:", error)
      toast.error("Failed to load folders")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error("Please enter a folder name")
      return
    }

    setCreating(true)
    try {
      const response = await fetch("/api/admin/folders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newFolderName.trim(),
          is_system: false,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create folder")
      }

      const newFolder = await response.json()
      setFolders((prev) => [...prev, newFolder])
      onChange(newFolder.id)
      setNewFolderName("")
      setCreateDialogOpen(false)
      toast.success("Folder created successfully")
    } catch (error) {
      console.error("Error creating folder:", error)
      toast.error(error.message || "Failed to create folder")
    } finally {
      setCreating(false)
    }
  }

  const selectedFolder = folders.find((folder) => folder.id === value)

  const getFolderColor = (folderName) => {
    const colors = generateColorFromString(folderName)
    return isDark ? colors.dark : colors.light
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full justify-between", error && "border-red-500", className)}
            disabled={disabled}
          >
            {selectedFolder ? (
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getFolderColor(selectedFolder.name) }}
                />
                <span className="truncate">{selectedFolder.name}</span>
                {selectedFolder.is_system && (
                  <Badge variant="secondary" className="text-xs">
                    System
                  </Badge>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Search folders..." />
            <CommandList>
              <CommandEmpty>{loading ? "Loading folders..." : "No folders found."}</CommandEmpty>
              <CommandGroup>
                {folders.map((folder) => (
                  <CommandItem
                    key={folder.id}
                    value={folder.name}
                    onSelect={() => {
                      onChange(folder.id)
                      setOpen(false)
                    }}
                    className="flex items-center gap-2"
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === folder.id ? "opacity-100" : "opacity-0")} />
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getFolderColor(folder.name) }} />
                    <span className="flex-1">{folder.name}</span>
                    {folder.is_system && (
                      <Badge variant="secondary" className="text-xs">
                        System
                      </Badge>
                    )}
                    {folder.usage_count > 0 && (
                      <span className="text-xs text-muted-foreground">({folder.usage_count})</span>
                    )}
                  </CommandItem>
                ))}
                <CommandItem
                  onSelect={() => {
                    setOpen(false)
                    setCreateDialogOpen(true)
                  }}
                  className="flex items-center gap-2 text-primary"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create new folder...
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Create Folder Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>Add a new folder to organize your resources.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="folder-name" className="text-right">
                Name
              </Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name"
                className="col-span-3"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateFolder()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false)
                setNewFolderName("")
              }}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleCreateFolder} disabled={creating || !newFolderName.trim()}>
              {creating ? "Creating..." : "Create Folder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
