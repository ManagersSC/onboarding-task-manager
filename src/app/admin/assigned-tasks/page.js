import { AssignedTasksLogsPage } from "@components/tasks/AssignedTasksLogsPage"

export const metadata = {
  title: "Onboarding Tasks Logs",
  description: "View onboarding tasks assigned to applicants",
}

export default function AssignedTasksLogs() {
  return (
    <div className="p-6 md:p-8 animate-fade-in-up">
      <AssignedTasksLogsPage />
    </div>
  )
} 