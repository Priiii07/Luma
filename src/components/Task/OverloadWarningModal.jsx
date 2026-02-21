import { format, parseISO } from 'date-fns'

const PHASE_LABELS = {
    menstrual: 'Menstrual (rest)',
    follicular: 'Follicular (building)',
    ovulation: 'Ovulation (peak)',
    luteal: 'Luteal (wind-down)'
}

function OverloadWarningModal({
    isOpen,
    scheduledDate,
    tasksOnDate,
    capacity,
    phase,
    alternatives = [],
    onAddAnyway,
    onUseAlternative,
    onCancel
}) {
    if (!isOpen) return null

    const formattedDate = scheduledDate ? format(parseISO(scheduledDate), 'EEEE, MMM d') : ''

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={onCancel} />

            {/* Modal */}
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
                <div className="rounded-2xl shadow-2xl w-full max-w-sm pointer-events-auto"
                     style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>

                    {/* Header */}
                    <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <div className="flex items-start gap-3">
                            <span className="text-2xl leading-none mt-0.5">⚠️</span>
                            <div>
                                <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Day is getting full</h3>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                                    {formattedDate} already has {tasksOnDate}/{capacity} tasks
                                    ({PHASE_LABELS[phase] || phase} phase)
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="px-5 py-4 space-y-3">
                        {alternatives.length > 0 && (
                            <div>
                                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Better options nearby:</p>
                                <div className="space-y-2">
                                    {alternatives.map(alt => (
                                        <button
                                            key={alt.date}
                                            onClick={() => onUseAlternative(alt.date)}
                                            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors text-left"
                                            style={{ border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)' }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.borderColor = 'var(--purple-primary)'
                                                e.currentTarget.style.background = 'rgba(198,120,221,0.08)'
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.borderColor = 'var(--border-subtle)'
                                                e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                                            }}
                                        >
                                            <div>
                                                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                                    {format(parseISO(alt.date), 'EEEE, MMM d')}
                                                </p>
                                                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                                                    {PHASE_LABELS[alt.phase] || alt.phase} · {alt.tasksOnDate}/{alt.capacity} tasks
                                                </p>
                                            </div>
                                            <span className="text-xs font-semibold ml-2" style={{ color: 'var(--purple-primary)' }}>
                                                {alt.score}pts
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {alternatives.length === 0 && (
                            <p className="text-sm text-center py-2" style={{ color: 'var(--text-tertiary)' }}>
                                No lighter alternatives found in this window.
                            </p>
                        )}
                    </div>

                    {/* Footer actions */}
                    <div className="px-5 pb-5 flex flex-col gap-2">
                        <button
                            onClick={onAddAnyway}
                            className="w-full py-2.5 text-white text-sm font-medium rounded-xl transition-colors"
                            style={{ background: 'linear-gradient(135deg, var(--purple-primary), var(--purple-dark))' }}
                        >
                            Add anyway ({formattedDate})
                        </button>
                        <button
                            onClick={onCancel}
                            className="w-full py-2.5 text-sm font-medium rounded-xl transition-colors"
                            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}
                        >
                            Cancel
                        </button>
                    </div>

                </div>
            </div>
        </>
    )
}

export default OverloadWarningModal
