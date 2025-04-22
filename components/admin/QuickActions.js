"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card"
import { Button } from "@components/ui/button"
import { PlusCircle, FileText, Users, BarChart3 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@components/ui/dialog"
import { CreateTaskDialog } from "@components/tasks/CreateTaskDialog"

export function QuickActions() {
  const router = useRouter()
  const [isResourceDialogOpen, setIsResourceDialogOpen] = useState(false)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <CreateTaskDialog
          trigger={
            <Button className="w-full justify-start" variant="outline">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Task
            </Button>
          }
        />

        <Dialog open={isResourceDialogOpen} onOpenChange={setIsResourceDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full justify-start" variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Manage Resources
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Manage Resources</DialogTitle>
              <DialogDescription>Add or edit resources for onboarding tasks.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Button
                onClick={() => {
                  setIsResourceDialogOpen(false)
                  router.push("/admin/resources")
                }}
                className="w-full"
              >
                Go to Resource Management
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button className="w-full justify-start" variant="outline" onClick={() => router.push("/admin/users")}>
          <Users className="mr-2 h-4 w-4" />
          Manage Users
        </Button>

        <Button className="w-full justify-start" variant="outline" onClick={() => router.push("/admin/reports")}>
          <BarChart3 className="mr-2 h-4 w-4" />
          View Reports
        </Button>
      </CardContent>
    </Card>
  )
}
