"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { FileText, FolderOpen, Clock, Search, FileImage, FileCode, FileIcon as FilePdf } from "lucide-react"
import { formatRelativeTime } from "@/lib/utils/format"
import { useDebounce } from "@/hooks/use-debounce"

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
  const debouncedSearchQuery = useDebounce(searchQuery, 500)
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileModalOpen, setFileModalOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(5)
  const [totalCount, setTotalCount] = useState(0)

  const fetchResources = useCallback(async (query = "", pageNum = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (query) params.append("query", query)
      params.append("page", pageNum)
      params.append("pageSize", pageSize)
      const url = `/api/admin/dashboard/resource-hub/?${params.toString()}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }

      const data = await response.json()
      const formattedResources = (data.resources || []).map((resource) => ({
        ...resource,
        formattedDate: formatRelativeTime(resource.updatedAt),
      }))
      setResources(formattedResources)
      setTotalCount(data.totalCount || 0)
      if (!query && pageNum === 1) {
        setRecentResources(formattedResources)
      }
      setError(null)
    } catch (err) {
      console.error("Error fetching resources:", err)
      setError("Failed to load resources. Please try again later.")
    } finally {
      setLoading(false)
    }
  }, [pageSize])

  // Fetch resources on component mount and when search query changes
  useEffect(() => {
    fetchResources()
  }, [pageSize])

  // Fetch when page or search changes
  useEffect(() => {
    fetchResources(debouncedSearchQuery, page)
  }, [debouncedSearchQuery, page, fetchResources])

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
              {/* Pagination Controls */}
              <div className="flex justify-between items-center mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {page} of {Math.max(1, Math.ceil(totalCount / pageSize))}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= Math.ceil(totalCount / pageSize) || loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
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
