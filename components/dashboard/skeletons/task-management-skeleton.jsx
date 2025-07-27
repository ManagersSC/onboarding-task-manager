"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader } from "@components/ui/card"
import { Skeleton } from "@components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs"

export function TaskManagementSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div>
                <Skeleton className="h-6 w-40 mb-2" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted/50 p-1 rounded-lg">
              <TabsTrigger value="upcoming" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Skeleton className="h-4 w-4 mr-2 rounded" />
                Upcoming
                <Skeleton className="ml-2 h-5 w-6 rounded-full" />
              </TabsTrigger>
              <TabsTrigger value="overdue" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Skeleton className="h-4 w-4 mr-2 rounded" />
                Overdue
                <Skeleton className="ml-2 h-5 w-6 rounded-full" />
              </TabsTrigger>
              <TabsTrigger value="flagged" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Skeleton className="h-4 w-4 mr-2 rounded" />
                Flagged
                <Skeleton className="ml-2 h-5 w-6 rounded-full" />
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="mt-0">
              <div className="space-y-6">
                {/* Priority Group Skeleton */}
                {[1, 2, 3].map((group) => (
                  <div key={group} className="mb-6">
                    {/* Group Header */}
                    <div className="flex items-center py-3 px-2 mb-4">
                      <Skeleton className="h-4 w-4 mr-3 rounded" />
                      <Skeleton className="h-4 w-4 mr-2 rounded" />
                      <Skeleton className="h-4 w-24 mr-3" />
                      <Skeleton className="h-5 w-6 rounded-full" />
                    </div>

                    {/* Task Cards */}
                    <div className="space-y-3 ml-6">
                      {[1, 2].map((task) => (
                        <div key={task} className="bg-card rounded-xl p-4 border border-border/50">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              {/* Badges */}
                              <div className="flex items-center gap-2 mb-3">
                                <Skeleton className="h-6 w-16 rounded-full" />
                                <Skeleton className="h-6 w-20 rounded-full" />
                                <Skeleton className="h-6 w-12 rounded-full" />
                              </div>

                              {/* Title */}
                              <Skeleton className="h-5 w-3/4 mb-3" />

                              {/* Meta Information */}
                              <div className="space-y-2">
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-2">
                                    <Skeleton className="h-5 w-5 rounded-full" />
                                    <Skeleton className="h-4 w-20" />
                                  </div>
                                  <Skeleton className="h-4 w-px" />
                                  <div className="flex items-center gap-1">
                                    <Skeleton className="h-3 w-3 rounded" />
                                    <Skeleton className="h-4 w-16" />
                                  </div>
                                </div>

                                <div className="flex items-center gap-1">
                                  <Skeleton className="h-3 w-3 rounded" />
                                  <Skeleton className="h-4 w-24" />
                                </div>

                                <div className="flex items-center gap-1">
                                  <Skeleton className="h-3 w-3 rounded" />
                                  <Skeleton className="h-4 w-16" />
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1">
                              <Skeleton className="h-8 w-8 rounded" />
                              <Skeleton className="h-8 w-8 rounded" />
                              <Skeleton className="h-8 w-8 rounded" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="overdue" className="mt-0">
              <div className="py-12 text-center">
                <Skeleton className="mx-auto w-16 h-16 rounded-full mb-4" />
                <Skeleton className="h-6 w-48 mx-auto mb-2" />
                <Skeleton className="h-4 w-64 mx-auto mb-6" />
                <Skeleton className="h-8 w-32 mx-auto rounded" />
              </div>
            </TabsContent>

            <TabsContent value="flagged" className="mt-0">
              <div className="py-12 text-center">
                <Skeleton className="mx-auto w-16 h-16 rounded-full mb-4" />
                <Skeleton className="h-6 w-48 mx-auto mb-2" />
                <Skeleton className="h-4 w-64 mx-auto mb-6" />
                <Skeleton className="h-8 w-32 mx-auto rounded" />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  )
}
