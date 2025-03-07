import { useState } from "react"
import { Clock, AlertCircle, CheckCircle } from "lucide-react"

export default function TaskCard({ task, onComplete }) {
  const [isCompleting, setIsCompleting] = useState(false)

  const handleComplete = async () => {
    setIsCompleting(true)
    try {
      await onComplete(task.id)
    } catch (error) {
      console.log("Error completing task:", error)
    } finally {
      setIsCompleting(false)
    }
  }

  const getStatusIcon = () => {
    if (task.completed) return <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
    if (task.overdue) return <AlertCircle className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" />
    return <Clock className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
  }

  const getStatusBadge = () => {
    if (task.completed)
      return <div className="bg-green-50 text-green-700 text-xs px-2.5 py-1 rounded-full font-medium">Completed</div>
    if (task.overdue)
      return <div className="bg-red-50 text-red-700 text-xs px-2.5 py-1 rounded-full font-medium">Overdue</div>
    return <div className="bg-gray-50 text-gray-700 text-xs px-2.5 py-1 rounded-full font-medium">Assigned</div>
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        {getStatusIcon()}
        <div className="space-y-2 flex-1">
          <h3 className="font-medium text-gray-900">{task.title}</h3>
          <p className="text-sm text-gray-500 leading-relaxed">{task.description}</p>
          <div className="flex items-center justify-between pt-2">
            {getStatusBadge()}
            <div className="flex items-center gap-2">
              {task.resourceUrl && (
                <a
                  href={task.resourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium"
                >
                  View Resource
                </a>
              )}
              {!task.completed && (
                <button
                  onClick={handleComplete}
                  disabled={isCompleting}
                  className="text-xs bg-black text-white px-3 py-1.5 rounded-md hover:bg-gray-800 transition-colors disabled:bg-gray-400"
                >
                  {isCompleting ? "Completing..." : "Complete"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

