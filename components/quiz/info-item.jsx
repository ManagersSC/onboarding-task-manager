import { Card, CardContent } from "@components/ui/card"
import { Info } from "lucide-react"

export default function InfoItem({ item }) {
  return (
    <Card className="bg-secondary/50 border-l-4 border-info">
      <CardContent className="pt-6">
        <div className="flex items-start space-x-3">
          <Info className="h-5 w-5 text-info mt-1 flex-shrink-0" />
          {/* Use dangerouslySetInnerHTML for HTML content, ensure text is sanitized if from user input */}
          {/* Assuming quiz content is trusted admin input */}
          <div className="prose prose-sm max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: item.text }} />
        </div>
      </CardContent>
    </Card>
  )
}
