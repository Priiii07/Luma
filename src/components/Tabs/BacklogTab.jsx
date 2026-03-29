import { useState, useMemo } from 'react'
import { completeTask } from '../../utils/storageHelpers'
import { filterTasksByTimeAndEnergy } from '../../utils/backlogFilters'
import BacklogCard from '../BacklogCard'
import TimePickerModal from '../TimePickerModal'
import TaskSuggestions from '../TaskSuggestions'
import InProgressTask from '../InProgressTask'

function BacklogTab({ tasks = [], currentPhaseInfo, onAddTask, onTaskClick }) {
    const [filter, setFilter] = useState('all') // all | high | medium | low
    const [showTimePicker, setShowTimePicker] = useState(false)
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [suggestedTasks, setSuggestedTasks] = useState([])
    const [inProgressTask, setInProgressTask] = useState(null)

    const currentPhase = currentPhaseInfo?.phase

    // Backlog = unscheduled + incomplete
    const backlogTasks = useMemo(() =>
        tasks.filter(t => !t.scheduledDate && !t.completed),
        [tasks]
    )

    const filteredTasks = useMemo(() => {
        if (filter === 'all') return backlogTasks
        return backlogTasks.filter(t => t.energyLevel === filter)
    }, [backlogTasks, filter])

    const handleTimePickerSubmit = (timeAvailable) => {
        const suggestions = filterTasksByTimeAndEnergy(backlogTasks, timeAvailable, currentPhase)
        setSuggestedTasks(suggestions)
        setShowTimePicker(false)
        setShowSuggestions(true)
    }

    const handleDoNow = (task) => {
        setInProgressTask({ ...task, startedAt: new Date().toISOString() })
        setShowSuggestions(false)
    }

    const handleTaskComplete = async (taskId) => {
        try {
            await completeTask(taskId)
            // onSnapshot in App.jsx will refresh tasks
        } catch (e) {
            console.error('Failed to complete task:', e)
        }
        setInProgressTask(null)
    }

    const handleSchedule = (task) => {
        // Open task detail modal — user can set a date there
        if (onTaskClick) onTaskClick(task)
    }

    const handleEdit = (task) => {
        if (onTaskClick) onTaskClick(task)
    }

    const energyCounts = useMemo(() => ({
        high: backlogTasks.filter(t => t.energyLevel === 'high').length,
        medium: backlogTasks.filter(t => t.energyLevel === 'medium').length,
        low: backlogTasks.filter(t => t.energyLevel === 'low').length
    }), [backlogTasks])

    return (
        <div className="backlog-tab">
            {/* In-progress task banner */}
            {inProgressTask && (
                <InProgressTask
                    task={inProgressTask}
                    onComplete={handleTaskComplete}
                    onCancel={() => setInProgressTask(null)}
                />
            )}

            {/* Smart "I have time now" card */}
            {!inProgressTask && (
                <div className="backlog-smart-card">
                    <span className="backlog-smart-icon">💡</span>
                    <div className="backlog-smart-content">
                        <h3>I have time now</h3>
                        <p>Let me help you decide what to tackle</p>
                    </div>
                    <button
                        className="backlog-smart-btn"
                        onClick={() => setShowTimePicker(true)}
                        disabled={backlogTasks.length === 0}
                    >
                        Find tasks
                    </button>
                </div>
            )}

            {/* Filter pills */}
            <div className="backlog-filters">
                {[
                    { id: 'all', label: `All (${backlogTasks.length})` },
                    { id: 'high', label: `High (${energyCounts.high})` },
                    { id: 'medium', label: `Medium (${energyCounts.medium})` },
                    { id: 'low', label: `Low (${energyCounts.low})` }
                ].map(f => (
                    <button
                        key={f.id}
                        className={`backlog-filter-pill ${filter === f.id ? 'active' : ''}`}
                        onClick={() => setFilter(f.id)}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Task list */}
            <div className="backlog-list">
                {filteredTasks.length === 0 ? (
                    <div className="backlog-empty">
                        <span className="backlog-empty-icon">📭</span>
                        <h3>
                            {filter === 'all'
                                ? 'No backlog tasks yet'
                                : `No ${filter} energy tasks`}
                        </h3>
                        <p>
                            {filter === 'all'
                                ? 'Add tasks here for when you have spare time'
                                : 'Try a different energy filter'}
                        </p>
                        {filter === 'all' && (
                            <button className="backlog-empty-btn" onClick={onAddTask}>
                                + Add to Backlog
                            </button>
                        )}
                    </div>
                ) : (
                    filteredTasks.map(task => (
                        <BacklogCard
                            key={task.id}
                            task={task}
                            onDoNow={handleDoNow}
                            onSchedule={handleSchedule}
                            onEdit={handleEdit}
                        />
                    ))
                )}
            </div>

            {/* Modals */}
            {showTimePicker && (
                <TimePickerModal
                    currentPhase={currentPhase}
                    onSubmit={handleTimePickerSubmit}
                    onClose={() => setShowTimePicker(false)}
                />
            )}

            {showSuggestions && (
                <TaskSuggestions
                    tasks={suggestedTasks}
                    currentPhase={currentPhase}
                    onDoNow={handleDoNow}
                    onClose={() => setShowSuggestions(false)}
                />
            )}
        </div>
    )
}

export default BacklogTab
