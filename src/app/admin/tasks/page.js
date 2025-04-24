import { TasksPage } from "@components/tasks/TasksPage"

export const metadata = {
  title: "Tasks Management",
  description: "Manage onboarding tasks and resources",
}

export default function AdminTasksPage() {
  return (
    <div className="p-6 space-y-6">
      <TasksPage />
    </div>
  )
}
