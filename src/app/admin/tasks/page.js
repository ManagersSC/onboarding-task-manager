import { TasksAndResourcesPage } from "@components/tasks/TasksAndResourcesPage"

export const metadata = {
  title: "Tasks & Resources",
  description: "Manage onboarding tasks and resources",
}

export default function TasksPage() {
  return (
    <div className="p-6 space-y-6">
      <TasksAndResourcesPage />
    </div>
  )
}
