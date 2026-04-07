import { useState, useEffect } from 'react'
import { format, parseISO, addDays } from 'date-fns'
import DatePicker from 'react-datepicker'
import { updateTask, deleteTask, completeTask, getTaskHistory, logTaskHistory, getRecurringDefinition, getAllTasks, getAllCycles, createTask } from '../../utils/storageHelpers'
import { scheduleTask } from '../../utils/taskScheduler'
import { stopRecurringSeries, editRecurringSeries } from '../../utils/recurringEngine'

const ENERGY_LABELS = { high: 'High Energy', medium: 'Medium Energy', low: 'Low Energy' }
const ACTION_LABELS = {
    created: 'Created',
    updated: 'Edited',
    rescheduled: 'Rescheduled',
    completed: 'Completed',
    deleted: 'Deleted',
    split: 'Split',
    extended: 'Extended to'
}

function TaskDetailModal({ task, onClose, onSaved, onDeleted, cycles = [], tasks: allTasks = [], userPreferences = {} }) {
    const [editing, setEditing] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [confirmStopSeries, setConfirmStopSeries] = useState(false)
    const [extendMode, setExtendMode] = useState(false)
    const [extendDate, setExtendDate] = useState(null)
    const [loading, setLoading] = useState(false)
    const [history, setHistory] = useState([])
    const [recurringDef, setRecurringDef] = useState(null)

    const [name, setName] = useState('')
    const [energyLevel, setEnergyLevel] = useState('')
    const [deadline, setDeadline] = useState(null)
    const [scheduledDate, setScheduledDate] = useState(null)
    const [preferredDays, setPreferredDays] = useState([])

    useEffect(() => {
        if (!task) return
        setName(task.name || '')
        setEnergyLevel(task.energyLevel || '')
        setDeadline(task.deadline ? parseISO(task.deadline) : null)
        setScheduledDate(task.scheduledDate ? parseISO(task.scheduledDate) : null)
        setPreferredDays(task.preferredDays || [])
        setEditing(false)
        setConfirmDelete(false)
        setConfirmStopSeries(false)
        setExtendMode(false)
        setExtendDate(null)
        setRecurringDef(null)
        loadHistory(task.id)
        if (task.recurringDefinitionId) {
            getRecurringDefinition(task.recurringDefinitionId).then(def => setRecurringDef(def || null))
        }
    }, [task?.id])

    async function loadHistory(taskId) {
        try {
            const entries = await getTaskHistory(taskId)
            setHistory(entries.reverse())
        } catch {
            setHistory([])
        }
    }

    const toggleDay = (day) => {
        setPreferredDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        )
    }

    async function handleSave() {
        setLoading(true)
        try {
            const newDeadline = deadline ? format(deadline, 'yyyy-MM-dd') : null
            const newScheduledDate = scheduledDate ? format(scheduledDate, 'yyyy-MM-dd') : null
            const newEnergyLevel = energyLevel || null

            const updates = {
                name,
                energyLevel: newEnergyLevel,
                deadline: newDeadline,
                scheduledDate: newScheduledDate,
                preferredDays: preferredDays.length > 0 ? preferredDays : null
            }

            // Check if deadline or energy changed — may need rescheduling
            const deadlineChanged = newDeadline !== (task.deadline || null)
            const energyChanged = newEnergyLevel !== (task.energyLevel || null)
            const scheduledDateManuallyChanged = newScheduledDate !== (task.scheduledDate || null)

            // If the user manually changed the scheduled date, respect that
            if (scheduledDateManuallyChanged) {
                updates.autoScheduled = false
            }

            // Auto-reschedule if deadline/energy changed, task is auto-scheduled,
            // user didn't manually move it, and rescheduling is automatic
            const shouldReschedule = (deadlineChanged || energyChanged) &&
                !scheduledDateManuallyChanged &&
                task.autoScheduled &&
                !task.completed &&
                cycles.length >= 2 &&
                userPreferences?.reschedulingBehavior === 'automatic'

            if (shouldReschedule) {
                const updatedTask = { ...task, ...updates }
                const bestDate = scheduleTask(updatedTask, allTasks, cycles, userPreferences)
                if (bestDate && bestDate !== task.scheduledDate) {
                    updates.scheduledDate = bestDate
                    updates.autoScheduled = true
                    await updateTask(task.id, updates)
                    await logTaskHistory(task.id, 'rescheduled', {
                        trigger: 'task_edit',
                        from: task.scheduledDate,
                        to: bestDate,
                        reason: deadlineChanged ? 'deadline changed' : 'energy level changed'
                    })
                } else {
                    await updateTask(task.id, updates)
                }
            } else {
                await updateTask(task.id, updates)
            }

            if (onSaved) await onSaved()
            setEditing(false)
            await loadHistory(task.id)
        } catch (e) {
            console.error('Failed to save task:', e)
        } finally {
            setLoading(false)
        }
    }

    async function handleComplete() {
        setLoading(true)
        try {
            await completeTask(task.id)
            if (onSaved) await onSaved()
            onClose()
        } catch (e) {
            console.error('Failed to complete task:', e)
        } finally {
            setLoading(false)
        }
    }

    async function handleDelete() {
        setLoading(true)
        try {
            await deleteTask(task.id)
            if (onDeleted) await onDeleted()
            onClose()
        } catch (e) {
            console.error('Failed to delete task:', e)
        } finally {
            setLoading(false)
        }
    }

    async function handleStopSeries() {
        setLoading(true)
        try {
            const currentTasks = await getAllTasks()
            await stopRecurringSeries(task.recurringDefinitionId, currentTasks)
            if (onSaved) await onSaved()
            onClose()
        } catch (e) {
            console.error('Failed to stop recurring series:', e)
        } finally {
            setLoading(false)
        }
    }

    async function handleExtend() {
        if (!extendDate) return
        setLoading(true)
        try {
            const newDateStr = format(extendDate, 'yyyy-MM-dd')
            await createTask({
                name: task.name,
                energyLevel: task.energyLevel || null,
                deadline: task.deadline || null,
                scheduledDate: newDateStr,
                preferredDays: task.preferredDays || null,
                completed: false,
                autoScheduled: false,
                extendedFromId: task.id,
                extendedFromDate: task.scheduledDate || null
            })
            await logTaskHistory(task.id, 'extended', {
                to: newDateStr
            })
            if (onSaved) await onSaved()
            setExtendMode(false)
            setExtendDate(null)
            onClose()
        } catch (e) {
            console.error('Failed to extend task:', e)
        } finally {
            setLoading(false)
        }
    }

    const isRecurring = !!task?.recurringDefinitionId
    const instanceStatusLabels = {
        active: { label: 'Active', color: 'var(--purple-primary)' },
        completed: { label: 'Completed', color: '#4ade80' },
        missed: { label: 'Missed', color: '#f59e0b' },
        skipped: { label: 'Skipped', color: 'var(--text-tertiary)' }
    }

    const recurrenceTypeLabels = {
        daily: 'Daily',
        weekly: 'Weekly',
        custom: 'Custom interval'
    }

    if (!task) return null

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="fixed inset-0 flex items-center justify-center z-50 p-2 md:p-4 pointer-events-none">
                <div className="rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] md:max-h-[85vh] flex flex-col pointer-events-auto"
                     style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>

                    {/* Header */}
                    <div className="px-4 py-3 md:px-6 md:py-5 flex items-start justify-between shrink-0"
                         style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <div className="flex-1 min-w-0 pr-4">
                            {editing ? (
                                <input
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full text-base font-semibold pb-0.5 focus:outline-none"
                                    style={{ color: 'var(--text-primary)', background: 'transparent', borderBottom: '1px solid var(--purple-primary)' }}
                                    autoFocus
                                />
                            ) : (
                                <h3 className="text-base font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{task.name}</h3>
                            )}
                            {task.completed && (
                                <span className="text-xs font-medium" style={{ color: '#4ade80' }}>Completed</span>
                            )}
                        </div>
                        <button onClick={onClose} className="text-2xl leading-none shrink-0" style={{ color: 'var(--text-tertiary)' }}>×</button>
                    </div>

                    {/* Body */}
                    <div className="overflow-y-auto flex-1 px-4 py-3 md:px-6 md:py-5 space-y-4 md:space-y-5">

                        {/* Scheduled Date */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--purple-primary)' }}>Scheduled Date</label>
                            {editing ? (
                                <DatePicker
                                    selected={scheduledDate}
                                    onChange={(date) => setScheduledDate(date)}
                                    dateFormat="MMM d, yyyy"
                                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                                    placeholderText="Select date"
                                    isClearable
                                />
                            ) : (
                                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                                    {task.scheduledDate ? format(parseISO(task.scheduledDate), 'EEEE, MMMM d, yyyy') : '—'}
                                </p>
                            )}
                        </div>

                        {/* Energy Level */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--purple-primary)' }}>Energy Type</label>
                            {editing ? (
                                <select
                                    value={energyLevel}
                                    onChange={e => setEnergyLevel(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}
                                >
                                    <option value="">Not set</option>
                                    <option value="low">Low Energy</option>
                                    <option value="medium">Medium Energy</option>
                                    <option value="high">High Energy</option>
                                </select>
                            ) : (
                                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                                    {task.energyLevel ? ENERGY_LABELS[task.energyLevel] : '—'}
                                </p>
                            )}
                        </div>

                        {/* Deadline */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--purple-primary)' }}>Deadline</label>
                            {editing ? (
                                <DatePicker
                                    selected={deadline}
                                    onChange={(date) => setDeadline(date)}
                                    dateFormat="MMM d, yyyy"
                                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                                    placeholderText="Select deadline"
                                    isClearable
                                />
                            ) : (
                                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                                    {task.deadline ? format(parseISO(task.deadline), 'MMMM d, yyyy') : 'None'}
                                </p>
                            )}
                        </div>

                        {/* Preferred Days */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--purple-primary)' }}>Preferred Days</label>
                            {editing ? (
                                <div className="flex gap-2 flex-wrap">
                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                        <label key={day} className="flex items-center gap-1 text-sm font-normal"
                                               style={{ color: 'var(--text-secondary)' }}>
                                            <input
                                                type="checkbox"
                                                checked={preferredDays.includes(day)}
                                                onChange={() => toggleDay(day)}
                                                className="rounded"
                                            />
                                            {day}
                                        </label>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                                    {task.preferredDays?.length > 0 ? task.preferredDays.join(', ') : 'Any day'}
                                </p>
                            )}
                        </div>

                        {/* Recurring Info */}
                        {isRecurring && (
                            <div className="rounded-xl p-4 space-y-2"
                                 style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm opacity-60">🔁</span>
                                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--purple-primary)' }}>
                                        Recurring Task
                                    </span>
                                    {task.instanceNumber && (
                                        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                                            · Instance #{task.instanceNumber}
                                        </span>
                                    )}
                                </div>
                                {task.instanceStatus && (
                                    <div className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: instanceStatusLabels[task.instanceStatus]?.color || 'var(--text-tertiary)' }} />
                                        <span className="text-xs font-medium" style={{ color: instanceStatusLabels[task.instanceStatus]?.color || 'var(--text-tertiary)' }}>
                                            {instanceStatusLabels[task.instanceStatus]?.label || task.instanceStatus}
                                        </span>
                                    </div>
                                )}
                                {recurringDef && (
                                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                        {recurrenceTypeLabels[recurringDef.recurrence?.type] || 'Recurring'}
                                        {recurringDef.recurrence?.type === 'weekly' && recurringDef.recurrence?.preferredDays?.length > 0 && (
                                            <span> · {recurringDef.recurrence.preferredDays.join(', ')}</span>
                                        )}
                                        {recurringDef.recurrence?.type === 'custom' && recurringDef.recurrence?.interval && (
                                            <span> · Every {recurringDef.recurrence.interval} days</span>
                                        )}
                                        {recurringDef.skipDuringMenstrual && (
                                            <span> · Skips menstrual</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* History */}
                        {history.length > 0 && (
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--purple-primary)' }}>History</label>
                                <div className="space-y-1.5">
                                    {history.map((entry, i) => (
                                        <div key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                                            <span className="shrink-0 w-1.5 h-1.5 rounded-full mt-1.5" style={{ background: 'var(--border-medium)' }} />
                                            <span>
                                                <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                                                    {ACTION_LABELS[entry.action] || entry.action}
                                                </span>
                                                {entry.metadata?.from && entry.metadata?.to && (
                                                    <span> · {entry.metadata.from.slice(5)} → {entry.metadata.to.slice(5)}</span>
                                                )}
                                                <span className="ml-1" style={{ color: 'var(--text-tertiary)' }}>
                                                    {format(parseISO(entry.timestamp), 'MMM d, h:mm a')}
                                                </span>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-3 md:px-6 md:py-4 shrink-0" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                        {confirmDelete ? (
                            <div className="flex gap-2">
                                <button
                                    onClick={handleDelete}
                                    disabled={loading}
                                    className="flex-1 py-2.5 text-white text-sm font-medium rounded-xl disabled:opacity-50"
                                    style={{ background: '#ef4444' }}
                                >
                                    {loading ? 'Deleting…' : isRecurring ? 'Yes, delete this instance' : 'Yes, delete'}
                                </button>
                                <button
                                    onClick={() => setConfirmDelete(false)}
                                    className="flex-1 py-2.5 text-sm font-medium rounded-xl"
                                    style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : confirmStopSeries ? (
                            <div className="space-y-2">
                                <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
                                    Stop this recurring series? Future instances will be deleted. Past instances are preserved.
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleStopSeries}
                                        disabled={loading}
                                        className="flex-1 py-2.5 text-white text-sm font-medium rounded-xl disabled:opacity-50"
                                        style={{ background: '#ef4444' }}
                                    >
                                        {loading ? 'Stopping…' : 'Yes, stop series'}
                                    </button>
                                    <button
                                        onClick={() => setConfirmStopSeries(false)}
                                        className="flex-1 py-2.5 text-sm font-medium rounded-xl"
                                        style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : editing ? (
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSave}
                                    disabled={loading || !name.trim()}
                                    className="flex-1 py-2.5 text-white text-sm font-medium rounded-xl disabled:opacity-40"
                                    style={{ background: 'linear-gradient(135deg, var(--purple-primary), var(--purple-dark))' }}
                                >
                                    {loading ? 'Saving…' : 'Save Changes'}
                                </button>
                                <button
                                    onClick={() => setEditing(false)}
                                    className="flex-1 py-2.5 text-sm font-medium rounded-xl"
                                    style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : extendMode ? (
                            <div className="space-y-3">
                                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                    Pick a date to continue this task. A new copy will be added on that day — the original stays as-is.
                                </p>
                                <DatePicker
                                    selected={extendDate}
                                    onChange={(date) => setExtendDate(date)}
                                    dateFormat="MMM d, yyyy"
                                    minDate={addDays(new Date(), 1)}
                                    placeholderText="Choose date…"
                                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleExtend}
                                        disabled={loading || !extendDate}
                                        className="flex-1 py-2.5 text-white text-sm font-medium rounded-xl disabled:opacity-40"
                                        style={{ background: 'linear-gradient(135deg, var(--purple-primary), var(--purple-dark))' }}
                                    >
                                        {loading ? 'Extending…' : 'Extend Task'}
                                    </button>
                                    <button
                                        onClick={() => { setExtendMode(false); setExtendDate(null) }}
                                        className="flex-1 py-2.5 text-sm font-medium rounded-xl"
                                        style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    {!task.completed && (
                                        <button
                                            onClick={handleComplete}
                                            disabled={loading}
                                            className="py-2.5 px-4 text-sm font-medium rounded-xl disabled:opacity-50"
                                            style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80' }}
                                        >
                                            ✓ Done
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setEditing(true)}
                                        className="flex-1 py-2.5 text-sm font-medium rounded-xl"
                                        style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
                                    >
                                        {isRecurring ? 'Edit Instance' : 'Edit'}
                                    </button>
                                    <button
                                        onClick={() => setConfirmDelete(true)}
                                        className="py-2.5 px-4 text-sm font-medium rounded-xl"
                                        style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                                    >
                                        Delete
                                    </button>
                                </div>
                                {!task.completed && (
                                    <button
                                        onClick={() => setExtendMode(true)}
                                        className="w-full py-2 text-xs font-medium rounded-xl"
                                        style={{ background: 'rgba(180,100,255,0.08)', color: 'var(--purple-primary)', border: '1px solid rgba(180,100,255,0.2)' }}
                                    >
                                        ↗ Extend to another day
                                    </button>
                                )}
                                {isRecurring && !task.completed && (
                                    <button
                                        onClick={() => setConfirmStopSeries(true)}
                                        className="w-full py-2 text-xs font-medium rounded-xl"
                                        style={{ background: 'rgba(239,68,68,0.05)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                                    >
                                        Stop Recurring Series
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </>
    )
}

export default TaskDetailModal
