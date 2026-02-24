import { useState } from 'react'
import { format } from 'date-fns'
import DatePicker from 'react-datepicker'
import { createTask, updateTask, createRecurringDefinition, getAllTasks, getAllCycles } from '../../utils/storageHelpers'
import { scheduleTaskWithAlternatives } from '../../utils/taskScheduler'
import { generateInstances } from '../../utils/recurringEngine'
import OverloadWarningModal from './OverloadWarningModal'

function TaskSidebar({ isOpen, onClose, onTaskCreated, cycles = [], tasks = [], userPreferences = {} }) {
    const [taskName, setTaskName] = useState('')
    const [energyLevel, setEnergyLevel] = useState('')
    const [deadline, setDeadline] = useState(null)
    const [preferredDays, setPreferredDays] = useState(['Sat', 'Sun'])
    const [loading, setLoading] = useState(false)

    // Recurring task state
    const [isRecurring, setIsRecurring] = useState(false)
    const [recurrenceType, setRecurrenceType] = useState('daily')
    const [recurrenceDays, setRecurrenceDays] = useState([])
    const [recurrenceInterval, setRecurrenceInterval] = useState(2)
    const [skipDuringMenstrual, setSkipDuringMenstrual] = useState(false)

    // Overload warning state
    const [pendingTask, setPendingTask] = useState(null)
    const [scheduleInfo, setScheduleInfo] = useState(null)
    const [showWarning, setShowWarning] = useState(false)

    const handleDayToggle = (day) => {
        setPreferredDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        )
    }

    const handleRecurrenceDayToggle = (day) => {
        setRecurrenceDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        )
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (isRecurring) {
                await handleRecurringCreate()
            } else {
                await handleOneOffCreate()
            }
        } catch (error) {
            console.error('Error creating task:', error)
        } finally {
            setLoading(false)
        }
    }

    async function handleOneOffCreate() {
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
    }

    async function handleRecurringCreate() {
        const recurrence = {
            type: recurrenceType,
            interval: recurrenceType === 'custom' ? recurrenceInterval : 1,
            preferredDays: recurrenceType === 'weekly' ? recurrenceDays : []
        }

        // Validate weekly has at least one day
        if (recurrenceType === 'weekly' && recurrenceDays.length === 0) {
            return
        }

        const defId = await createRecurringDefinition({
            name: taskName,
            energyLevel: energyLevel || null,
            recurrence,
            skipDuringMenstrual,
            generationWindow: 14
        })

        // Generate initial instances
        const allTasks = await getAllTasks()
        const allCycles = await getAllCycles()
        const def = {
            id: defId,
            name: taskName,
            energyLevel: energyLevel || null,
            recurrence,
            skipDuringMenstrual,
            generationWindow: 14,
            active: true,
            lastGenerated: new Date().toISOString()
        }

        await generateInstances(def, allTasks, allCycles, userPreferences)

        if (onTaskCreated) onTaskCreated()
        resetForm()
        onClose()
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
        setIsRecurring(false)
        setRecurrenceType('daily')
        setRecurrenceDays([])
        setRecurrenceInterval(2)
        setSkipDuringMenstrual(false)
        setLoading(false)
    }

    const isWeeklyInvalid = isRecurring && recurrenceType === 'weekly' && recurrenceDays.length === 0

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
                                    background: 'var(--surface-2)',
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
                                    background: 'var(--surface-2)',
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

                        {/* Deadline — only for one-off tasks */}
                        {!isRecurring && (
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
                        )}

                        {/* Preferred Days — only for one-off tasks */}
                        {!isRecurring && (
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
                        )}

                        {/* ── Recurring Task Toggle ── */}
                        <div className="mb-5 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <button
                                    type="button"
                                    onClick={() => setIsRecurring(!isRecurring)}
                                    className="relative shrink-0 w-10 h-6 rounded-full transition-colors focus:outline-none"
                                    style={{ background: isRecurring ? 'var(--purple-primary)' : 'var(--toggle-off)' }}
                                    role="switch"
                                    aria-checked={isRecurring}
                                >
                                    <span className={`absolute left-0 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                        isRecurring ? 'translate-x-[22px]' : 'translate-x-[2px]'
                                    }`} />
                                </button>
                                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                    Make this a recurring task
                                </span>
                            </label>
                        </div>

                        {/* ── Recurring Options ── */}
                        {isRecurring && (
                            <div className="space-y-4 mb-5 p-4 rounded-xl"
                                 style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}>

                                {/* Recurrence type */}
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wide mb-2"
                                           style={{ color: 'var(--purple-primary)' }}>
                                        Repeat
                                    </label>
                                    <div className="flex gap-2">
                                        {[
                                            { value: 'daily', label: 'Daily' },
                                            { value: 'weekly', label: 'Weekly' },
                                            { value: 'custom', label: 'Custom' }
                                        ].map(opt => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => setRecurrenceType(opt.value)}
                                                className="flex-1 py-2 text-sm font-medium rounded-lg transition-all"
                                                style={{
                                                    background: recurrenceType === opt.value ? 'rgba(198,120,221,0.15)' : 'var(--surface-2)',
                                                    border: `1px solid ${recurrenceType === opt.value ? 'var(--purple-primary)' : 'var(--border-subtle)'}`,
                                                    color: recurrenceType === opt.value ? 'var(--purple-light)' : 'var(--text-secondary)'
                                                }}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Weekly: day selector */}
                                {recurrenceType === 'weekly' && (
                                    <div>
                                        <label className="block text-xs font-medium mb-2"
                                               style={{ color: 'var(--text-secondary)' }}>
                                            Which days? *
                                        </label>
                                        <div className="flex gap-1.5">
                                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                                <button
                                                    key={day}
                                                    type="button"
                                                    onClick={() => handleRecurrenceDayToggle(day)}
                                                    className="flex-1 py-2 text-xs font-medium rounded-lg transition-all"
                                                    style={{
                                                        background: recurrenceDays.includes(day) ? 'var(--purple-primary)' : 'var(--surface-2)',
                                                        color: recurrenceDays.includes(day) ? 'white' : 'var(--text-tertiary)',
                                                        border: `1px solid ${recurrenceDays.includes(day) ? 'var(--purple-primary)' : 'var(--border-subtle)'}`
                                                    }}
                                                >
                                                    {day}
                                                </button>
                                            ))}
                                        </div>
                                        {recurrenceDays.length === 0 && (
                                            <p className="text-xs mt-1" style={{ color: 'var(--error)' }}>
                                                Select at least one day
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Custom: interval */}
                                {recurrenceType === 'custom' && (
                                    <div>
                                        <label className="block text-xs font-medium mb-2"
                                               style={{ color: 'var(--text-secondary)' }}>
                                            Repeat every
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min={2}
                                                max={30}
                                                value={recurrenceInterval}
                                                onChange={e => setRecurrenceInterval(Math.max(2, parseInt(e.target.value) || 2))}
                                                className="w-20 px-3 py-2 rounded-md text-sm text-center focus:outline-none"
                                                style={{
                                                    background: 'var(--surface-2)',
                                                    border: '1px solid var(--border-medium)',
                                                    color: 'var(--text-primary)'
                                                }}
                                            />
                                            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>days</span>
                                        </div>
                                    </div>
                                )}

                                {/* Skip during menstrual (high energy only) */}
                                {energyLevel === 'high' && (
                                    <label className="flex items-start gap-3 cursor-pointer pt-2"
                                           style={{ borderTop: '1px solid var(--border-subtle)' }}>
                                        <input
                                            type="checkbox"
                                            checked={skipDuringMenstrual}
                                            onChange={e => setSkipDuringMenstrual(e.target.checked)}
                                            className="mt-0.5"
                                        />
                                        <div>
                                            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                                Skip during menstrual phase
                                            </p>
                                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                                                High-energy tasks will be automatically skipped during your period
                                            </p>
                                        </div>
                                    </label>
                                )}

                                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                                    Instances will be generated for the next 2 weeks
                                </p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || isWeeklyInvalid}
                            className="w-full px-5 py-2.5 text-white rounded-lg text-sm font-medium transition-all mt-6 disabled:opacity-50"
                            style={{
                                background: 'linear-gradient(135deg, var(--purple-primary), var(--purple-dark))',
                                boxShadow: '0 2px 12px var(--purple-glow)'
                            }}
                        >
                            {loading ? 'Creating...' : isRecurring ? 'Create Recurring Task' : 'Create Task'}
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
