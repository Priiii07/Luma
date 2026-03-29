const CATEGORY_ICONS = {
    chores: '🏠', admin: '📋', personal: '💆',
    work: '💼', health: '🏃', social: '👥'
}

const MATCH_CONFIG = {
    perfect: { label: '✨ Perfect match', className: 'match-perfect' },
    good: { label: '👍 Good fit', className: 'match-good' },
    doable: { label: '⚠️ Doable', className: 'match-doable' }
}

const TIME_LABELS = {
    15: '15 min', 30: '30 min', 60: '1 hr', 120: '2 hr', 180: '3+ hr'
}

function TaskSuggestions({ tasks, currentPhase, onDoNow, onClose }) {
    const phaseLabel = currentPhase
        ? currentPhase.charAt(0).toUpperCase() + currentPhase.slice(1)
        : null

    return (
        <div className="ts-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
            <div className="ts-modal">
                <div className="ts-header">
                    <button className="ts-back" onClick={onClose}>←</button>
                    <h2>Perfect for right now</h2>
                    <button className="ts-close" onClick={onClose}>✕</button>
                </div>

                <div className="ts-body">
                    {phaseLabel && (
                        <div className="ts-context">
                            💡 Based on your <strong>{phaseLabel} phase</strong>
                        </div>
                    )}

                    {tasks.length === 0 ? (
                        <div className="ts-empty">
                            <span className="ts-empty-icon">🤷</span>
                            <p>No matching tasks found</p>
                            <p className="ts-empty-hint">Try more time or add backlog tasks</p>
                        </div>
                    ) : (
                        <div className="ts-list">
                            <p className="ts-count">
                                {tasks.length} task{tasks.length !== 1 ? 's' : ''} found
                            </p>
                            {tasks.map(task => {
                                const match = MATCH_CONFIG[task.matchReason] || MATCH_CONFIG.doable
                                const icon = CATEGORY_ICONS[task.category] || '📌'
                                const timeLabel = TIME_LABELS[task.timeEstimate] || (task.timeEstimate ? `${task.timeEstimate}m` : null)
                                return (
                                    <div key={task.id} className="ts-card">
                                        <div className="ts-card-header">
                                            <span className="ts-card-icon">{icon}</span>
                                            <h4 className="ts-card-title">{task.name}</h4>
                                        </div>
                                        <div className="ts-card-meta">
                                            <span className={`ts-match-badge ${match.className}`}>
                                                {match.label}
                                            </span>
                                            {task.energyLevel && (
                                                <span className="ts-energy">⚡ {task.energyLevel}</span>
                                            )}
                                            {timeLabel && (
                                                <span className="ts-time">⏱ {timeLabel}</span>
                                            )}
                                        </div>
                                        <button
                                            className="ts-do-now-btn"
                                            onClick={() => { onDoNow(task); onClose() }}
                                        >
                                            Do This Now →
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                <div className="ts-footer">
                    <button className="ts-link-btn" onClick={onClose}>← Back to all tasks</button>
                </div>
            </div>
        </div>
    )
}

export default TaskSuggestions
