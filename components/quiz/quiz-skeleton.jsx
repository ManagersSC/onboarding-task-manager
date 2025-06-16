import { Skeleton } from "@components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@components/ui/card"

export default function QuizSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-center mb-6">
        <Skeleton className="h-10 w-10 rounded-md mr-2" />
        <Skeleton className="h-8 w-1/2" />
      </div>

      {[1, 2].map((i) => (
        <Card key={`info-skeleton-${i}`}>
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <Skeleton className="h-5 w-5 rounded-full mt-1" />
              <div className="space-y-2 flex-grow">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {[1, 2, 3].map((i) => (
        <Card key={`question-skeleton-${i}`}>
          <CardHeader>
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/4" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3].map((j) => (
              <div key={`option-skeleton-${j}`} className="flex items-center space-x-3 p-4 border rounded-lg">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-4 flex-grow" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
      <Skeleton className="h-12 w-full md:w-40 mt-8" />
    </div>
  )
}
