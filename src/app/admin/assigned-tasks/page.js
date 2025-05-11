import { AssignedTasksLogsPage } from "@components/tasks/AssignedTasksLogsPage"

export const metadata = {
  title: "Onboarding Tasks Logs",
  description: "View onboarding tasks assigned to applicants",
}

export default function AssignedTasksLogs() {
  return (
    <div className="p-6 space-y-6">
      <AssignedTasksLogsPage />
    </div>
  )
} 