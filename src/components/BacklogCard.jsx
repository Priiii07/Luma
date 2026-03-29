const ENERGY_COLORS = {
    low: 'var(--phase-follicular-border)',
    medium: 'var(--phase-luteal-border)',
    high: 'var(--purple-primary)'
}

const ENERGY_LABELS = {
    low: 'Low Energy',
    medium: 'Medium Energy',
    high: 'High Energy'
}

const TIME_LABELS = {
    15: '15 min',
    30: '30 min',
    60: '1 hour',
    120: '2 hours',
    180: '3+ hours'
}

const CATEGORY_ICONS = {
    chores: '🏠',
    admin: '📋',
    personal: '💆',
    work: '💼',
    health: '🏃',
    social: '👥'
}

function BacklogCard({ task, onDoNow, onSchedule, onEdit }) {
    const icon = CATEGORY_ICONS[task.category] || '📌'
    const energyColor = ENERGY_COLORS[task.energyLevel] || 'var(--text-tertiary)'
    const energyLabel = ENERGY_LABELS[task.energyLevel] || task.energyLevel || '—'
    const timeLabel = TIME_LABELS[task.timeEstimate] || (task.timeEstimate ? `${task.timeEstimate} min` : null)

    return (
        <div className="backlog-card">
            <div className="backlog-card-header">
                <span className="backlog-card-icon">{icon}</span>
                <div className="backlog-card-title-group">
                    <h4 className="backlog-card-title">{task.name}</h4>
                    <div className="backlog-card-meta">
                        {task.energyLevel && (
                            <span
                                className="backlog-energy-badge"
                                style={{ background: energyColor }}
                            >
                                ⚡ {energyLabel}
                            </span>
                        )}
                        {timeLabel && (
                            <span className="backlog-time-badge">⏱ {timeLabel}</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="backlog-card-actions">
                <button className="backlog-btn-do-now" onClick={() => onDoNow(task)}>
                    Do Now
                </button>
                <button className="backlog-btn-schedule" onClick={() => onSchedule(task)}>
                    Schedule
                </button>
                <button className="backlog-btn-icon" onClick={() => onEdit(task)} title="Edit">
                    ✎
                </button>
            </div>
        </div>
    )
}

export default BacklogCard
