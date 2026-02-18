import { format, parseISO } from 'date-fns'

const PHASE_LABELS = {
    menstrual: 'Menstrual (rest)',
    follicular: 'Follicular (building)',
    ovulation: 'Ovulation (peak)',
    luteal: 'Luteal (wind-down)'
}

/**
 * Modal shown before saving a task when the scheduled date is at/over capacity.
 *
 * Actions:
 *   - Add Anyway     → proceed with the over-capacity date
 *   - Use Alternative → pick one of the top-3 scored alternatives
 *   - Cancel          → dismiss, let user edit the form
 *
 * Props:
 *   isOpen          – boolean
 *   scheduledDate   – ISO string (best pick, possibly over capacity)
 *   tasksOnDate     – number of tasks already on that date
 *   capacity        – max for that phase
 *   phase           – phase name for that date
 *   alternatives    – [{ date, phase, tasksOnDate, capacity, score }]
 *   onAddAnyway     – () => void
 *   onUseAlternative – (dateStr: string) => void
 *   onCancel        – () => void
 */
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
            <div className="fixed inset-0 bg-black/40 z-50" onClick={onCancel} />

            {/* Modal */}
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm pointer-events-auto">

                    {/* Header */}
                    <div className="px-5 pt-5 pb-4 border-b border-gray-100">
                        <div className="flex items-start gap-3">
                            <span className="text-2xl leading-none mt-0.5">⚠️</span>
                            <div>
                                <h3 className="text-base font-semibold text-gray-900">Day is getting full</h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {formattedDate} already has {tasksOnDate}/{capacity} tasks
                                    ({PHASE_LABELS[phase] || phase} phase)
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="px-5 py-4 space-y-3">

                        {/* Alternative dates */}
                        {alternatives.length > 0 && (
                            <div>
                                <p className="text-xs font-medium text-gray-600 mb-2">Better options nearby:</p>
                                <div className="space-y-2">
                                    {alternatives.map(alt => (
                                        <button
                                            key={alt.date}
                                            onClick={() => onUseAlternative(alt.date)}
                                            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors text-left"
                                        >
                                            <div>
                                                <p className="text-sm font-medium text-gray-800">
                                                    {format(parseISO(alt.date), 'EEEE, MMM d')}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {PHASE_LABELS[alt.phase] || alt.phase} · {alt.tasksOnDate}/{alt.capacity} tasks
                                                </p>
                                            </div>
                                            <span className="text-xs font-semibold text-purple-600 ml-2">
                                                {alt.score}pts
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {alternatives.length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-2">
                                No lighter alternatives found in this window.
                            </p>
                        )}
                    </div>

                    {/* Footer actions */}
                    <div className="px-5 pb-5 flex flex-col gap-2">
                        <button
                            onClick={onAddAnyway}
                            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition-colors"
                        >
                            Add anyway ({formattedDate})
                        </button>
                        <button
                            onClick={onCancel}
                            className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors"
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
