import { useState, useEffect } from 'react'

function InProgressTask({ task, onComplete, onCancel }) {
    const [elapsed, setElapsed] = useState(0)
    const startTime = new Date(task.startedAt).getTime()

    useEffect(() => {
        const interval = setInterval(() => {
            setElapsed(Math.floor((Date.now() - startTime) / 1000))
        }, 1000)
        return () => clearInterval(interval)
    }, [startTime])

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60)
        const s = secs % 60
        return `${m}:${String(s).padStart(2, '0')}`
    }

    const estimatedSecs = (task.timeEstimate || 0) * 60
    const isOvertime = estimatedSecs > 0 && elapsed > estimatedSecs

    return (
        <div className="inprogress-card">
            <div className="inprogress-label">📍 Currently working on</div>
            <h2 className="inprogress-title">{task.name}</h2>

            <div className="inprogress-times">
                <div className="inprogress-time-row">
                    <span>Started</span>
                    <span>{new Date(task.startedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                </div>
                <div className="inprogress-time-row">
                    <span>Elapsed</span>
                    <span className="inprogress-timer">{formatTime(elapsed)}</span>
                </div>
                {task.timeEstimate && (
                    <div className="inprogress-time-row">
                        <span>Estimated</span>
                        <span>{task.timeEstimate} min</span>
                    </div>
                )}
            </div>

            {isOvertime && (
                <div className="inprogress-overtime">
                    ⏰ Over estimated time — take a break if needed!
                </div>
            )}

            <div className="inprogress-actions">
                <button className="inprogress-btn-done" onClick={() => onComplete(task.id, elapsed)}>
                    ✓ Mark as Done
                </button>
                <button className="inprogress-btn-cancel" onClick={onCancel}>
                    Cancel
                </button>
            </div>
        </div>
    )
}

export default InProgressTask
