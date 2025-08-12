import ApplicantsPage from "@components/admin/users/users-page"
import { getApplicants } from "@/lib/mock-db"

export const dynamic = "force-dynamic"

export default async function Page() {
  const applicants = await getApplicants()
  return <ApplicantsPage initialApplicants={applicants} />
}
