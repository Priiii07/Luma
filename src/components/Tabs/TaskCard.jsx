import { format, parseISO } from 'date-fns'
import { completeTask } from '../../utils/storageHelpers'

const ENERGY_LABELS = { high: 'High', medium: 'Medium', low: 'Low' }

function TaskCard({ task, onTaskClick, onToggleComplete }) {
    const handleCheckbox = async (e) => {
        e.stopPropagation()
        if (task.completed) return
        try {
            await completeTask(task.id)
            if (onToggleComplete) onToggleComplete()
        } catch (err) {
            console.error('Failed to complete task:', err)
        }
    }

    const handleEdit = (e) => {
        e.stopPropagation()
        onTaskClick?.(task)
    }

    return (
        <div
            className={`task-card ${task.completed ? 'completed' : ''}`}
            onClick={() => onTaskClick?.(task)}
        >
            <button
                className="task-card-checkbox"
                onClick={handleCheckbox}
            >
                {task.completed ? '✓' : ''}
            </button>

            <div className="task-card-body">
                <div className="task-card-name">
                    {task.recurringDefinitionId && <span className="task-card-recurring">🔁</span>}
                    {task.name}
                </div>
                <div className="task-card-meta">
                    {task.energyLevel && (
                        <span className={`task-card-energy ${task.energyLevel}`}>
                            {ENERGY_LABELS[task.energyLevel]}
                        </span>
                    )}
                    {task.deadline && (
                        <span className="task-card-deadline">
                            Due {format(parseISO(task.deadline), 'MMM d')}
                        </span>
                    )}
                </div>
            </div>

            {/* Action buttons */}
            {!task.completed && (
                <div className="task-card-actions">
                    <button
                        className="task-card-action-btn task-card-action-complete"
                        onClick={handleCheckbox}
                        title="Complete"
                    >
                        ✓
                    </button>
                    <button
                        className="task-card-action-btn task-card-action-edit"
                        onClick={handleEdit}
                        title="Edit"
                    >
                        ✎
                    </button>
                </div>
            )}
        </div>
    )
}

export default TaskCard
