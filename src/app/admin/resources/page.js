import { ResourcePage } from "@components/tasks/ResourcePage"

export const metadata = {
  title: "Resources",
  description: "Manage onboarding task templates and resources",
}

export default function AdminResourcesPage() {
  return (
    <div className="p-6 md:p-8">
      <ResourcePage />
    </div>
  )
}
