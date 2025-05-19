"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { FileText, FolderOpen, Clock, Search, FileImage, FileCode, FileIcon as FilePdf } from "lucide-react"
import { formatRelativeTime } from "@/lib/utils/format"

import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card"
import { Input } from "@components/ui/input"
import { Button } from "@components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs"
import { Skeleton } from "@components/ui/skeleton"
import { FileViewerModal } from "@components/dashboard/subComponents/file-viewer-modal"

export function ResourceHub() {
  const [resources, setResources] = useState([])
  const [recentResources, setRecentResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchTimeout, setSearchTimeout] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileModalOpen, setFileModalOpen] = useState(false)

  // Fetch resources on component mount and when search query changes
  useEffect(() => {
    fetchResources()
  }, [])

  // Handle search with debounce
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }

    const timeout = setTimeout(() => {
      fetchResources(searchQuery)
    }, 500) // 500ms debounce

    setSearchTimeout(timeout)

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout)
      }
    }
  }, [searchQuery])

  const fetchResources = async (query = "") => {
    setLoading(true)
    try {
      const url = `/api/admin/dashboard/resource-hub/${query ? `?query=${encodeURIComponent(query)}` : ""}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }

      const data = await response.json()

      // Format the data and set state
      const formattedResources = data.map((resource) => ({
        ...resource,
        // Format the date to a relative time (e.g., "2 days ago")
        formattedDate: formatRelativeTime(resource.updatedAt),
      }))

      setResources(formattedResources)

      // If this is the initial load (no search query), also set recent resources
      if (!query) {
        setRecentResources(formattedResources)
      }

      setError(null)
    } catch (err) {
      console.error("Error fetching resources:", err)
      setError("Failed to load resources. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    setSearchQuery(e.target.value)
  }

  const handleFileClick = (file) => {
    setSelectedFile(file)
    setFileModalOpen(true)
  }

  const getResourceIcon = (resource) => {
    if (!resource.mimeType) return <FileText className="h-4 w-4 text-primary" />

    if (resource.mimeType.startsWith("image/")) {
      return <FileImage className="h-4 w-4 text-primary" />
    } else if (resource.mimeType.includes("pdf")) {
      return <FilePdf className="h-4 w-4 text-primary" />
    } else if (
      resource.mimeType.includes("text") ||
      resource.mimeType.includes("javascript") ||
      resource.mimeType.includes("json") ||
      resource.mimeType.includes("html") ||
      resource.mimeType.includes("css")
    ) {
      return <FileCode className="h-4 w-4 text-primary" />
    } else if (resource.type === "folder") {
      return <FolderOpen className="h-4 w-4 text-primary" />
    }

    return <FileText className="h-4 w-4 text-primary" />
  }

  const renderResourceList = (resourceList) => {
    if (loading) {
      return Array(3)
        .fill(0)
        .map((_, index) => (
          <div key={`skeleton-${index}`} className="flex items-center p-2 rounded-md">
            <Skeleton className="p-2 rounded-md bg-primary/10 mr-3 h-8 w-8" />
            <div className="flex-1 min-w-0">
              <Skeleton className="h-4 w-3/4 mb-1" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))
    }

    if (error) {
      return (
        <div className="text-center py-4 text-muted-foreground">
          <p>{error}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => fetchResources(searchQuery)}>
            Try Again
          </Button>
        </div>
      )
    }

    if (resourceList.length === 0) {
      return (
        <div className="text-center py-4 text-muted-foreground">
          <p>No resources found.</p>
        </div>
      )
    }

    return resourceList.map((resource, index) => (
      <motion.div
        key={resource.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: index * 0.1 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center p-2 rounded-md hover:bg-muted cursor-pointer"
        onClick={() => handleFileClick(resource)}
      >
        <div className="p-2 rounded-md bg-primary/10 mr-3">{getResourceIcon(resource)}</div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium truncate">{resource.title}</h4>
          <div className="flex items-center text-xs text-muted-foreground mt-0.5">
            <Clock className="h-3 w-3 mr-1" />
            <span>{resource.formattedDate}</span>
          </div>
        </div>
      </motion.div>
    ))
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
    >
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Resource Hub</CardTitle>
            <Button variant="ghost" size="sm">
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search resources..."
              className="pl-8"
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>

          <Tabs defaultValue="templates">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="recent">Recent</TabsTrigger>
            </TabsList>

            <TabsContent value="templates" className="mt-4 space-y-2">
              {renderResourceList(resources)}
            </TabsContent>

            <TabsContent value="recent" className="mt-4 space-y-2">
              {renderResourceList(recentResources)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* File Viewer Modal */}
      <FileViewerModal file={selectedFile} open={fileModalOpen} onOpenChange={setFileModalOpen} />
    </motion.div>
  )
}
