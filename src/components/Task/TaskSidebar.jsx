import { useState } from 'react'
import { format } from 'date-fns'
import DatePicker from 'react-datepicker'
import { createTask, updateTask } from '../../utils/storageHelpers'
import { scheduleTaskWithAlternatives } from '../../utils/taskScheduler'
import OverloadWarningModal from './OverloadWarningModal'

function TaskSidebar({ isOpen, onClose, onTaskCreated, cycles = [], tasks = [], userPreferences = {} }) {
    const [taskName, setTaskName] = useState('')
    const [energyLevel, setEnergyLevel] = useState('')
    const [deadline, setDeadline] = useState(null)
    const [preferredDays, setPreferredDays] = useState(['Sat', 'Sun'])
    const [loading, setLoading] = useState(false)

    // Overload warning state
    const [pendingTask, setPendingTask] = useState(null)
    const [scheduleInfo, setScheduleInfo] = useState(null)
    const [showWarning, setShowWarning] = useState(false)

    const handleDayToggle = (day) => {
        setPreferredDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        )
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            const task = {
                name: taskName,
                energyLevel: energyLevel || null,
                deadline: deadline ? format(deadline, 'yyyy-MM-dd') : null,
                preferredDays: preferredDays.length > 0 ? preferredDays : null,
                autoScheduled: true
            }

            const info = scheduleTaskWithAlternatives(task, tasks, cycles, userPreferences)

            if (info.isAtCapacity) {
                setPendingTask(task)
                setScheduleInfo(info)
                setShowWarning(true)
                setLoading(false)
                return
            }

            await saveTask(task, info.scheduledDate)
        } catch (error) {
            console.error('Error creating task:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleConfirmSave = async (dateOverride) => {
        setShowWarning(false)
        setLoading(true)
        try {
            const date = dateOverride ?? scheduleInfo.scheduledDate
            await saveTask(pendingTask, date)
        } catch (error) {
            console.error('Error saving task after warning:', error)
        } finally {
            setPendingTask(null)
            setScheduleInfo(null)
            setLoading(false)
        }
    }

    const handleCancelWarning = () => {
        setShowWarning(false)
        setPendingTask(null)
        setScheduleInfo(null)
    }

    async function saveTask(task, scheduledDate) {
        const taskId = await createTask(task)
        await updateTask(taskId, { scheduledDate })
        if (onTaskCreated) onTaskCreated()
        resetForm()
        onClose()
    }

    function resetForm() {
        setTaskName('')
        setEnergyLevel('')
        setDeadline(null)
        setPreferredDays(['Sat', 'Sun'])
        setLoading(false)
    }

    return (
        <>
            {/* Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-40"
                    onMouseDown={onClose}
                ></div>
            )}

            {/* Sidebar */}
            <div className={`
                fixed right-0 top-0 w-96 h-screen shadow-2xl z-50
                transition-transform duration-300 overflow-y-auto
                ${isOpen ? 'translate-x-0' : 'translate-x-full'}
            `} style={{ background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-subtle)' }}>
                <div className="px-6 py-6 flex justify-between items-center"
                     style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <h3 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>Add New Task</h3>
                    <button
                        onClick={onClose}
                        className="text-2xl leading-none transition-colors"
                        style={{ color: 'var(--text-tertiary)' }}
                    >
                        ×
                    </button>
                </div>

                <div className="px-6 py-6">
                    <form onSubmit={handleSubmit}>
                        <div className="mb-5">
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                                Task Name *
                            </label>
                            <input
                                type="text"
                                placeholder="e.g., Finish presentation slides"
                                required
                                value={taskName}
                                onChange={(e) => setTaskName(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-md text-sm focus:outline-none"
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid var(--border-medium)',
                                    color: 'var(--text-primary)'
                                }}
                            />
                        </div>

                        <div className="mb-5">
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                                Energy Type
                            </label>
                            <select
                                value={energyLevel}
                                onChange={(e) => setEnergyLevel(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-md text-sm focus:outline-none"
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid var(--border-medium)',
                                    color: 'var(--text-primary)'
                                }}
                            >
                                <option value="">Auto-detect</option>
                                <option value="low">Low Energy</option>
                                <option value="medium">Medium Energy</option>
                                <option value="high">High Energy</option>
                            </select>
                            <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                                We'll suggest the best time based on this
                            </div>
                        </div>

                        <div className="mb-5">
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                                Deadline (Optional)
                            </label>
                            <DatePicker
                                selected={deadline}
                                onChange={(date) => setDeadline(date)}
                                dateFormat="MMM d, yyyy"
                                minDate={new Date()}
                                className="w-full px-3 py-2.5 rounded-md text-sm focus:outline-none"
                                placeholderText="Select deadline"
                                isClearable
                            />
                            <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                                We'll prioritize scheduling before this date
                            </div>
                        </div>

                        <div className="mb-5">
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                                Preferred Days (Optional)
                            </label>
                            <div className="flex gap-2 flex-wrap mt-2">
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                                    <label key={day} className="flex items-center gap-1.5 font-normal text-sm"
                                           style={{ color: 'var(--text-secondary)' }}>
                                        <input
                                            type="checkbox"
                                            checked={preferredDays.includes(day)}
                                            onChange={() => handleDayToggle(day)}
                                            className="rounded"
                                        />
                                        {day}
                                    </label>
                                ))}
                            </div>
                            <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                                Weekends preferred by default
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full px-5 py-2.5 text-white rounded-lg text-sm font-medium transition-all mt-6 disabled:opacity-50"
                            style={{
                                background: 'linear-gradient(135deg, var(--purple-primary), var(--purple-dark))',
                                boxShadow: '0 2px 12px var(--purple-glow)'
                            }}
                        >
                            {loading ? 'Creating...' : 'Create Task'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Overload warning modal */}
            {scheduleInfo && (
                <OverloadWarningModal
                    isOpen={showWarning}
                    scheduledDate={scheduleInfo.scheduledDate}
                    tasksOnDate={scheduleInfo.tasksOnDate}
                    capacity={scheduleInfo.capacity}
                    phase={scheduleInfo.phase}
                    alternatives={scheduleInfo.alternatives}
                    onAddAnyway={() => handleConfirmSave(null)}
                    onUseAlternative={(date) => handleConfirmSave(date)}
                    onCancel={handleCancelWarning}
                />
            )}
        </>
    )
}

export default TaskSidebar
