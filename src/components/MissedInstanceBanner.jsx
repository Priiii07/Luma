/**
 * Gentle notification for missed recurring task instances.
 * Shows individual tasks with options to reschedule or dismiss.
 */
function MissedInstanceBanner({ missedInstances = [], onReschedule, onDismiss }) {
    if (!missedInstances.length) return null

    return (
        <div className="mx-6 mb-3 px-4 py-3 rounded text-sm"
             style={{
                 background: 'var(--banner-warning-bg)',
                 borderLeft: '4px solid var(--banner-warning-border)',
                 color: 'var(--banner-warning-text)'
             }}>
            <div className="flex items-center gap-2 mb-2">
                <span>📋</span>
                <span className="font-medium">
                    {missedInstances.length} recurring task{missedInstances.length > 1 ? 's' : ''} from
                    {missedInstances.length > 1 ? ' recent days' : ' yesterday'} — that's okay!
                </span>
            </div>
            <div className="space-y-2">
                {missedInstances.map(task => (
                    <div key={task.id} className="flex items-center gap-2 pl-6">
                        <span className="flex-1 truncate text-xs">{task.name}</span>
                        <button
                            onClick={() => onReschedule(task)}
                            className="shrink-0 px-2 py-1 text-xs font-medium rounded-md transition-colors"
                            style={{
                                background: 'var(--purple-primary)',
                                color: 'white'
                            }}
                        >
                            Reschedule
                        </button>
                        <button
                            onClick={() => onDismiss(task)}
                            className="shrink-0 px-2 py-1 text-xs font-medium rounded-md transition-colors"
                            style={{
                                background: 'var(--surface-2)',
                                color: 'var(--text-secondary)'
                            }}
                        >
                            Let it go
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default MissedInstanceBanner
