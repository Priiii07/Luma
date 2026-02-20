import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import DatePicker from 'react-datepicker'
import { updateTask, deleteTask, completeTask, getTaskHistory } from '../../utils/storageHelpers'

const ENERGY_LABELS = { high: 'High Energy', medium: 'Medium Energy', low: 'Low Energy' }
const ACTION_LABELS = {
    created: 'Created',
    updated: 'Edited',
    rescheduled: 'Rescheduled',
    completed: 'Completed',
    deleted: 'Deleted',
    split: 'Split'
}

/**
 * Modal for viewing and editing a task's details.
 *
 * Props:
 *   task         – task object (null = modal closed)
 *   onClose      – () => void
 *   onSaved      – () => void  (reload tasks)
 *   onDeleted    – () => void  (reload tasks)
 */
function TaskDetailModal({ task, onClose, onSaved, onDeleted }) {
    const [editing, setEditing] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [loading, setLoading] = useState(false)
    const [history, setHistory] = useState([])

    // Editable fields
    const [name, setName] = useState('')
    const [energyLevel, setEnergyLevel] = useState('')
    const [deadline, setDeadline] = useState(null)
    const [scheduledDate, setScheduledDate] = useState(null)
    const [preferredDays, setPreferredDays] = useState([])

    useEffect(() => {
        if (!task) return
        // Reset edit fields whenever a new task is opened
        setName(task.name || '')
        setEnergyLevel(task.energyLevel || '')
        setDeadline(task.deadline ? parseISO(task.deadline) : null)
        setScheduledDate(task.scheduledDate ? parseISO(task.scheduledDate) : null)
        setPreferredDays(task.preferredDays || [])
        setEditing(false)
        setConfirmDelete(false)
        loadHistory(task.id)
    }, [task?.id])

    async function loadHistory(taskId) {
        try {
            const entries = await getTaskHistory(taskId)
            setHistory(entries.reverse()) // newest first
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
            await updateTask(task.id, {
                name,
                energyLevel: energyLevel || null,
                deadline: deadline ? format(deadline, 'yyyy-MM-dd') : null,
                scheduledDate: scheduledDate ? format(scheduledDate, 'yyyy-MM-dd') : null,
                preferredDays: preferredDays.length > 0 ? preferredDays : null
            })
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

    if (!task) return null

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/30 z-50" onClick={onClose} />

            {/* Modal */}
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col pointer-events-auto">

                    {/* Header */}
                    <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between shrink-0">
                        <div className="flex-1 min-w-0 pr-4">
                            {editing ? (
                                <input
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full text-base font-semibold text-gray-900 border-b border-purple-400 focus:outline-none pb-0.5"
                                    autoFocus
                                />
                            ) : (
                                <h3 className="text-base font-semibold text-gray-900 truncate">{task.name}</h3>
                            )}
                            {task.completed && (
                                <span className="text-xs text-green-600 font-medium">Completed</span>
                            )}
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none shrink-0">×</button>
                    </div>

                    {/* Body */}
                    <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

                        {/* Scheduled Date */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Scheduled Date</label>
                            {editing ? (
                                <DatePicker
                                    selected={scheduledDate}
                                    onChange={(date) => setScheduledDate(date)}
                                    dateFormat="MMM d, yyyy"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-purple-600"
                                    placeholderText="Select date"
                                    isClearable
                                />
                            ) : (
                                <p className="text-sm text-gray-800">
                                    {task.scheduledDate ? format(parseISO(task.scheduledDate), 'EEEE, MMMM d, yyyy') : '—'}
                                </p>
                            )}
                        </div>

                        {/* Energy Level */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Energy Type</label>
                            {editing ? (
                                <select
                                    value={energyLevel}
                                    onChange={e => setEnergyLevel(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-purple-600"
                                >
                                    <option value="">Not set</option>
                                    <option value="low">Low Energy</option>
                                    <option value="medium">Medium Energy</option>
                                    <option value="high">High Energy</option>
                                </select>
                            ) : (
                                <p className="text-sm text-gray-800">
                                    {task.energyLevel ? ENERGY_LABELS[task.energyLevel] : '—'}
                                </p>
                            )}
                        </div>

                        {/* Deadline */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Deadline</label>
                            {editing ? (
                                <DatePicker
                                    selected={deadline}
                                    onChange={(date) => setDeadline(date)}
                                    dateFormat="MMM d, yyyy"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-purple-600"
                                    placeholderText="Select deadline"
                                    isClearable
                                />
                            ) : (
                                <p className="text-sm text-gray-800">
                                    {task.deadline ? format(parseISO(task.deadline), 'MMMM d, yyyy') : 'None'}
                                </p>
                            )}
                        </div>

                        {/* Preferred Days */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Preferred Days</label>
                            {editing ? (
                                <div className="flex gap-2 flex-wrap">
                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                        <label key={day} className="flex items-center gap-1 text-sm font-normal">
                                            <input
                                                type="checkbox"
                                                checked={preferredDays.includes(day)}
                                                onChange={() => toggleDay(day)}
                                                className="rounded border-gray-300 text-purple-600 focus:ring-purple-600"
                                            />
                                            {day}
                                        </label>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-800">
                                    {task.preferredDays?.length > 0 ? task.preferredDays.join(', ') : 'Any day'}
                                </p>
                            )}
                        </div>

                        {/* History */}
                        {history.length > 0 && (
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">History</label>
                                <div className="space-y-1.5">
                                    {history.map((entry, i) => (
                                        <div key={i} className="flex items-start gap-2 text-xs text-gray-500">
                                            <span className="shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5" />
                                            <span>
                                                <span className="font-medium text-gray-700">
                                                    {ACTION_LABELS[entry.action] || entry.action}
                                                </span>
                                                {entry.metadata?.from && entry.metadata?.to && (
                                                    <span> · {entry.metadata.from.slice(5)} → {entry.metadata.to.slice(5)}</span>
                                                )}
                                                <span className="ml-1 text-gray-400">
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
                    <div className="px-6 py-4 border-t border-gray-100 shrink-0">
                        {confirmDelete ? (
                            <div className="flex gap-2">
                                <button
                                    onClick={handleDelete}
                                    disabled={loading}
                                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl disabled:opacity-50"
                                >
                                    {loading ? 'Deleting…' : 'Yes, delete'}
                                </button>
                                <button
                                    onClick={() => setConfirmDelete(false)}
                                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl"
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : editing ? (
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSave}
                                    disabled={loading || !name.trim()}
                                    className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl disabled:opacity-40"
                                >
                                    {loading ? 'Saving…' : 'Save Changes'}
                                </button>
                                <button
                                    onClick={() => setEditing(false)}
                                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl"
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                {!task.completed && (
                                    <button
                                        onClick={handleComplete}
                                        disabled={loading}
                                        className="py-2.5 px-4 bg-green-50 hover:bg-green-100 text-green-700 text-sm font-medium rounded-xl disabled:opacity-50"
                                    >
                                        ✓ Done
                                    </button>
                                )}
                                <button
                                    onClick={() => setEditing(true)}
                                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => setConfirmDelete(true)}
                                    className="py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium rounded-xl"
                                >
                                    Delete
                                </button>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </>
    )
}

export default TaskDetailModal
