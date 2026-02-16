import { useState } from 'react'
import { createTask, updateTask } from '../../utils/storageHelpers'
import { scheduleTask } from '../../utils/taskScheduler'

function TaskSidebar({ isOpen, onClose, onTaskCreated, cycles = [], tasks = [] }) {
    const [taskName, setTaskName] = useState('')
    const [energyLevel, setEnergyLevel] = useState('')
    const [deadline, setDeadline] = useState('')
    const [preferredDays, setPreferredDays] = useState(['Sat', 'Sun'])
    const [loading, setLoading] = useState(false)

    const handleDayToggle = (day) => {
        setPreferredDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        )
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            // Create task object
            const task = {
                name: taskName,
                energyLevel: energyLevel || null,
                deadline: deadline || null,
                preferredDays: preferredDays.length > 0 ? preferredDays : null
            }

            // Save to IndexedDB
            const taskId = await createTask(task)

            // Compute scheduled date — works with or without cycle data
            const scheduledDate = scheduleTask(task, tasks, cycles)
            await updateTask(taskId, { scheduledDate })

            // Notify parent to refresh tasks
            if (onTaskCreated) {
                onTaskCreated()
            }

            // Reset form
            setTaskName('')
            setEnergyLevel('')
            setDeadline('')
            setPreferredDays(['Sat', 'Sun'])

            onClose()
        } catch (error) {
            console.error('Error creating task:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            {/* Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 z-40"
                    onClick={onClose}
                ></div>
            )}

            {/* Sidebar */}
            <div className={`
        fixed right-0 top-0 w-96 h-screen bg-white shadow-2xl z-50
        transition-transform duration-300 overflow-y-auto
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
                <div className="px-6 py-6 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-800">Add New Task</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                    >
                        ×
                    </button>
                </div>

                <div className="px-6 py-6">
                    <form onSubmit={handleSubmit}>
                        <div className="mb-5">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Task Name *
                            </label>
                            <input
                                type="text"
                                placeholder="e.g., Finish presentation slides"
                                required
                                value={taskName}
                                onChange={(e) => setTaskName(e.target.value)}
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm
                         focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                            />
                        </div>

                        <div className="mb-5">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Energy Type
                            </label>
                            <select
                                value={energyLevel}
                                onChange={(e) => setEnergyLevel(e.target.value)}
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm
                               focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600">
                                <option value="">Auto-detect</option>
                                <option value="low">Low Energy</option>
                                <option value="medium">Medium Energy</option>
                                <option value="high">High Energy</option>
                            </select>
                            <div className="text-xs text-gray-500 mt-1">
                                We'll suggest the best time based on this
                            </div>
                        </div>

                        <div className="mb-5">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Deadline (Optional)
                            </label>
                            <input
                                type="date"
                                value={deadline}
                                onChange={(e) => setDeadline(e.target.value)}
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm
                         focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                            />
                            <div className="text-xs text-gray-500 mt-1">
                                We'll prioritize scheduling before this date
                            </div>
                        </div>

                        <div className="mb-5">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Preferred Days (Optional)
                            </label>
                            <div className="flex gap-2 flex-wrap mt-2">
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                                    <label key={day} className="flex items-center gap-1.5 font-normal text-sm">
                                        <input
                                            type="checkbox"
                                            checked={preferredDays.includes(day)}
                                            onChange={() => handleDayToggle(day)}
                                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-600"
                                        />
                                        {day}
                                    </label>
                                ))}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                Weekends preferred by default
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white 
                       rounded-lg text-sm font-medium transition-colors mt-6 disabled:opacity-50"
                        >
                            {loading ? 'Creating...' : 'Create Task'}
                        </button>
                    </form>
                </div>
            </div>
        </>
    )
}

export default TaskSidebar

