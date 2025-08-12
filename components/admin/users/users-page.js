"use client"

import { useMemo, useState, useCallback } from "react"
import { Button } from "@components/ui/button"
import { Input } from "@components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@components/ui/tabs"
import { Users, Filter, Plus, RotateCw } from "lucide-react"
import UsersTable from "./users-table"
import AddApplicantDialog from "./add-applicant-dialog"

export default function ApplicantsPage({ initialApplicants = [] }) {
  const [data, setData] = useState(initialApplicants)
  const [query, setQuery] = useState("")
  const [stagePreset, setStagePreset] = useState("all")
  const [addOpen, setAddOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const stageGroups = {
      all: () => true,
      new: (a) => a.stage === "New Application",
      first: (a) =>
        ["First Interview Invite Sent", "First Interview Booked", "Under Review", "Reviewed"].includes(a.stage),
      second: (a) => ["Second Interview Invite Sent", "Second Interview Booked", "Reviewed (2nd)"].includes(a.stage),
      hired: (a) => a.stage === "Hired",
      rejected: (a) => a.stage.toLowerCase().startsWith("rejected"),
    }

    return data
      .filter((a) => (stageGroups[stagePreset] ? stageGroups[stagePreset](a) : true))
      .filter((a) => {
        if (!q) return true
        return (
          a.name.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          (a.phone || "").toLowerCase().includes(q) ||
          (a.job || "").toLowerCase().includes(q)
        )
      })
  }, [data, query, stagePreset])

  const handleRefresh = useCallback(() => {
    setQuery("")
    setStagePreset("all")
  }, [])

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6" />
        <h1 className="text-xl font-semibold tracking-tight">Applicants</h1>
      </div>

      <Card className="border-none shadow-none">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-base font-medium">Manage and track applicants across your pipeline</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh} className="cursor-pointer bg-transparent">
                <RotateCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button size="sm" onClick={() => setAddOpen(true)} className="cursor-pointer">
                <Plus className="mr-2 h-4 w-4" />
                Add Applicant
              </Button>
            </div>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search name, email, phone, job..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 opacity-60" />
              <Tabs value={stagePreset} onValueChange={setStagePreset} className="w-full">
                <TabsList className="flex w-full flex-wrap gap-2 rounded-lg bg-muted/30 p-1">
                  <TabsTrigger value="all" className="cursor-pointer rounded-md px-3 py-1.5">
                    All
                  </TabsTrigger>
                  <TabsTrigger value="new" className="cursor-pointer rounded-md px-3 py-1.5">
                    New
                  </TabsTrigger>
                  <TabsTrigger value="first" className="cursor-pointer rounded-md px-3 py-1.5">
                    First
                  </TabsTrigger>
                  <TabsTrigger value="second" className="cursor-pointer rounded-md px-3 py-1.5">
                    Second
                  </TabsTrigger>
                  <TabsTrigger value="hired" className="cursor-pointer rounded-md px-3 py-1.5">
                    Hired
                  </TabsTrigger>
                  <TabsTrigger value="rejected" className="cursor-pointer rounded-md px-3 py-1.5">
                    Rejected
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="all" />
                <TabsContent value="new" />
                <TabsContent value="first" />
                <TabsContent value="second" />
                <TabsContent value="hired" />
                <TabsContent value="rejected" />
              </Tabs>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <UsersTable initialRows={filtered} onRowsChange={(nextAll) => setData(nextAll)} allRows={data} />
        </CardContent>
      </Card>

      <AddApplicantDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdded={(newApplicants) => {
          if (!newApplicants || newApplicants.length === 0) return
          setData((prev) => [...newApplicants, ...prev])
        }}
      />
    </div>
  )
}
