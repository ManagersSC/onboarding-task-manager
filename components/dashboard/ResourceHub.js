"use client"

import { motion } from "framer-motion"
import { FileText, FolderOpen, Clock, Search } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card"
import { Input } from "@components/ui/input"
import { Button } from "@components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs"

// Demo data
const resources = {
  templates: [
    {
      id: 1,
      title: "Welcome Email Template",
      type: "document",
      updatedAt: "2 days ago",
    },
    {
      id: 2,
      title: "IT Setup Checklist",
      type: "document",
      updatedAt: "1 week ago",
    },
    {
      id: 3,
      title: "First Day Orientation",
      type: "document",
      updatedAt: "3 days ago",
    },
  ],
  recent: [
    {
      id: 4,
      title: "Engineering Onboarding",
      type: "folder",
      updatedAt: "Today",
    },
    {
      id: 5,
      title: "Benefits Overview 2023",
      type: "document",
      updatedAt: "Yesterday",
    },
    {
      id: 6,
      title: "Company Handbook",
      type: "document",
      updatedAt: "3 days ago",
    },
  ],
}

export function ResourceHub() {
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
            <Input type="search" placeholder="Search resources..." className="pl-8" />
          </div>

          <Tabs defaultValue="templates">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="recent">Recent</TabsTrigger>
            </TabsList>

            <TabsContent value="templates" className="mt-4 space-y-2">
              {resources.templates.map((resource, index) => (
                <motion.div
                  key={resource.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  className="flex items-center p-2 rounded-md hover:bg-muted cursor-pointer"
                >
                  <div className="p-2 rounded-md bg-primary/10 mr-3">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium truncate">{resource.title}</h4>
                    <div className="flex items-center text-xs text-muted-foreground mt-0.5">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>{resource.updatedAt}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </TabsContent>

            <TabsContent value="recent" className="mt-4 space-y-2">
              {resources.recent.map((resource, index) => (
                <motion.div
                  key={resource.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  className="flex items-center p-2 rounded-md hover:bg-muted cursor-pointer"
                >
                  <div className="p-2 rounded-md bg-primary/10 mr-3">
                    {resource.type === "folder" ? (
                      <FolderOpen className="h-4 w-4 text-primary" />
                    ) : (
                      <FileText className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium truncate">{resource.title}</h4>
                    <div className="flex items-center text-xs text-muted-foreground mt-0.5">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>{resource.updatedAt}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  )
}
