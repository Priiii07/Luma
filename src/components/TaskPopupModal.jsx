import { useState, useEffect, useRef } from 'react'
import { format, parseISO } from 'date-fns'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { completeTask, deleteTask, updateTask } from '../utils/storageHelpers'

const ENERGY_LABELS = { high: 'High Energy', medium: 'Medium Energy', low: 'Low Energy' }
const SWIPE_THRESHOLD = 50

function TaskPopupModal({ dateStr, tasks = [], onClose, onAddTask, onTaskUpdated }) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [loading, setLoading] = useState(false)
    const [swipeOffset, setSwipeOffset] = useState(0)
    const [showReschedulePicker, setShowReschedulePicker] = useState(false)
    const [rescheduleDate, setRescheduleDate] = useState(null)
    const touchStartRef = useRef(null)
    const popupContentRef = useRef(null)

    // Filter tasks for this specific date
    const dateTasks = tasks.filter(t => t.scheduledDate === dateStr)
    const currentTask = dateTasks[currentIndex]
    const hasMultipleTasks = dateTasks.length > 1

    // Reset index and reschedule picker when date changes
    useEffect(() => {
        setCurrentIndex(0)
        setShowReschedulePicker(false)
    }, [dateStr])

    // Close reschedule picker when navigating between tasks
    useEffect(() => {
        setShowReschedulePicker(false)
    }, [currentIndex])

    // Close on ESC
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [onClose])

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) onClose()
    }

    const goToPrevious = () => {
        if (currentIndex > 0) setCurrentIndex(currentIndex - 1)
    }

    const goToNext = () => {
        if (currentIndex < dateTasks.length - 1) setCurrentIndex(currentIndex + 1)
    }

    // Touch swipe handlers
    const handleTouchStart = (e) => {
        touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        setSwipeOffset(0)
    }

    const handleTouchMove = (e) => {
        if (!touchStartRef.current || !hasMultipleTasks) return
        const deltaX = e.touches[0].clientX - touchStartRef.current.x
        const deltaY = Math.abs(e.touches[0].clientY - touchStartRef.current.y)
        // Only track horizontal swipes (ignore vertical scrolling)
        if (deltaY > Math.abs(deltaX)) return
        // Limit offset at edges
        if ((currentIndex === 0 && deltaX > 0) || (currentIndex === dateTasks.length - 1 && deltaX < 0)) {
            setSwipeOffset(deltaX * 0.3) // rubber-band effect
        } else {
            setSwipeOffset(deltaX)
        }
    }

    const handleTouchEnd = () => {
        if (!touchStartRef.current || !hasMultipleTasks) {
            touchStartRef.current = null
            setSwipeOffset(0)
            return
        }
        if (swipeOffset < -SWIPE_THRESHOLD) {
            goToNext()
        } else if (swipeOffset > SWIPE_THRESHOLD) {
            goToPrevious()
        }
        touchStartRef.current = null
        setSwipeOffset(0)
    }

    const handleComplete = async () => {
        if (!currentTask || loading) return
        setLoading(true)
        try {
            await completeTask(currentTask.id)
            if (onTaskUpdated) onTaskUpdated()
            // If we were on the last task and there are others, go back one
            if (currentIndex >= dateTasks.length - 1 && dateTasks.length > 1) {
                setCurrentIndex(currentIndex - 1)
            }
        } catch (e) {
            console.error('Failed to complete task:', e)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!currentTask || loading) return
        setLoading(true)
        try {
            await deleteTask(currentTask.id)
            if (onTaskUpdated) onTaskUpdated()
            if (dateTasks.length <= 1) {
                onClose()
            } else if (currentIndex >= dateTasks.length - 1) {
                setCurrentIndex(currentIndex - 1)
            }
        } catch (e) {
            console.error('Failed to delete task:', e)
        } finally {
            setLoading(false)
        }
    }

    const handleRescheduleClick = () => {
        setRescheduleDate(currentTask ? parseISO(currentTask.scheduledDate) : new Date())
        setShowReschedulePicker(true)
    }

    const handleRescheduleConfirm = async () => {
        if (!rescheduleDate || !currentTask || loading) return
        const newDateStr = format(rescheduleDate, 'yyyy-MM-dd')
        if (newDateStr === currentTask.scheduledDate) {
            setShowReschedulePicker(false)
            return
        }
        setLoading(true)
        try {
            await updateTask(currentTask.id, { scheduledDate: newDateStr, autoScheduled: false })
            if (onTaskUpdated) onTaskUpdated()
            setShowReschedulePicker(false)
            if (dateTasks.length <= 1) onClose()
        } catch (e) {
            console.error('Failed to reschedule task:', e)
        } finally {
            setLoading(false)
        }
    }

    // Format date for display
    const displayDate = dateStr
        ? format(parseISO(dateStr), 'EEEE, MMMM d')
        : ''

    // No tasks on this day
    if (dateTasks.length === 0) {
        return (
            <div className="task-popup-backdrop" onClick={handleBackdropClick}>
                <div className="task-popup task-popup-empty">
                    <button className="task-popup-close" onClick={onClose}>✕</button>

                    <div className="task-popup-empty-state">
                        <span className="task-popup-empty-icon">📭</span>
                        <h3>No tasks scheduled</h3>
                        <p>{displayDate}</p>
                    </div>

                    <div className="task-popup-actions">
                        <button onClick={() => { onClose(); onAddTask?.() }} className="task-popup-btn-primary">
                            + Add Task
                        </button>
                        <button onClick={onClose} className="task-popup-btn-ghost">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // Has tasks — show current task
    const contentStyle = swipeOffset !== 0
        ? { transform: `translateX(${swipeOffset}px)`, transition: 'none' }
        : { transform: 'translateX(0)', transition: 'transform 0.25s ease' }

    return (
        <div className="task-popup-backdrop" onClick={handleBackdropClick}>
            <div
                className="task-popup"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Header */}
                <div className="task-popup-header">
                    <span className="task-popup-counter">
                        Task {currentIndex + 1} of {dateTasks.length}
                    </span>
                    <button className="task-popup-close" onClick={onClose}>✕</button>
                </div>

                {/* Navigation arrows */}
                {hasMultipleTasks && (
                    <>
                        <button
                            className="task-popup-nav prev"
                            onClick={goToPrevious}
                            disabled={currentIndex === 0}
                        >
                            ‹
                        </button>
                        <button
                            className="task-popup-nav next"
                            onClick={goToNext}
                            disabled={currentIndex === dateTasks.length - 1}
                        >
                            ›
                        </button>
                    </>
                )}

                {/* Task content — swipeable */}
                <div className="task-popup-content" ref={popupContentRef} style={contentStyle}>
                    <h2 className="task-popup-title">
                        {currentTask.recurringDefinitionId && <span className="task-popup-recurring">🔁</span>}
                        {currentTask.name}
                    </h2>

                    <p className="task-popup-date">{displayDate}</p>

                    <div className="task-popup-details">
                        {currentTask.energyLevel && (
                            <div className="task-popup-detail-row">
                                <span className="task-popup-detail-label">Energy</span>
                                <span className={`task-popup-energy-badge ${currentTask.energyLevel}`}>
                                    {ENERGY_LABELS[currentTask.energyLevel]}
                                </span>
                            </div>
                        )}

                        {currentTask.deadline && (
                            <div className="task-popup-detail-row">
                                <span className="task-popup-detail-label">Deadline</span>
                                <span className="task-popup-detail-value">
                                    {format(parseISO(currentTask.deadline), 'MMM d, yyyy')}
                                </span>
                            </div>
                        )}

                        {currentTask.preferredDays?.length > 0 && (
                            <div className="task-popup-detail-row">
                                <span className="task-popup-detail-label">Preferred</span>
                                <span className="task-popup-detail-value">
                                    {currentTask.preferredDays.join(', ')}
                                </span>
                            </div>
                        )}

                        <div className="task-popup-detail-row">
                            <span className="task-popup-detail-label">Status</span>
                            <span className={`task-popup-status-badge ${currentTask.completed ? 'completed' : 'pending'}`}>
                                {currentTask.completed ? '✓ Completed' : 'Pending'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Swipe hint for multiple tasks */}
                {hasMultipleTasks && (
                    <div className="task-popup-swipe-hint">
                        <div className="task-popup-dots">
                            {dateTasks.map((_, i) => (
                                <span
                                    key={i}
                                    className={`task-popup-dot ${i === currentIndex ? 'active' : ''}`}
                                />
                            ))}
                        </div>
                        <span className="task-popup-swipe-text">Swipe to navigate</span>
                    </div>
                )}

                {/* Reschedule date picker */}
                {showReschedulePicker && (
                    <div className="task-popup-reschedule-picker">
                        <h4>Select new date</h4>
                        <DatePicker
                            selected={rescheduleDate}
                            onChange={(date) => setRescheduleDate(date)}
                            inline
                            minDate={new Date()}
                            dateFormat="yyyy-MM-dd"
                        />
                        <div className="task-popup-picker-actions">
                            <button
                                onClick={handleRescheduleConfirm}
                                disabled={loading}
                                className="task-popup-picker-confirm"
                            >
                                {loading ? 'Saving…' : 'Confirm'}
                            </button>
                            <button
                                onClick={() => setShowReschedulePicker(false)}
                                className="task-popup-picker-cancel"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Action buttons */}
                {!showReschedulePicker && (
                    <div className="task-popup-actions">
                        {!currentTask.completed && (
                            <button
                                onClick={handleComplete}
                                disabled={loading}
                                className="task-popup-btn-primary"
                            >
                                {loading ? 'Saving…' : '✓ Complete'}
                            </button>
                        )}
                        <button
                            onClick={handleRescheduleClick}
                            disabled={loading}
                            className="task-popup-btn-reschedule"
                        >
                            📅 Reschedule
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={loading}
                            className="task-popup-btn-delete"
                        >
                            🗑 Delete
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default TaskPopupModal
