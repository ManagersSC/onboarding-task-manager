import TaskCard from "./TaskCard"

export default function TaskList({ title, tasks, onComplete }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">{title}</h2>
      <div className="space-y-4">
        {tasks.length > 0 ? (
          tasks.map((task) => <TaskCard key={task.id} task={task} onComplete={onComplete} />)
        ) : (
          <p className="text-gray-500 text-sm">No tasks available.</p>
        )}
      </div>
    </div>
  )
}

