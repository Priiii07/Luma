import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { applyRescheduling } from '../utils/reschedulingEngine'
import { updateTask, logTaskHistory } from '../utils/storageHelpers'

/**
 * Modal for reviewing two kinds of schedule suggestions:
 *   1. Reschedule — tasks whose dates worsened after a cycle update
 *   2. Pull-forward — tasks that could move into underutilised ovulation slots
 *
 * Props:
 *   isOpen        – boolean
 *   onClose       – () => void
 *   suggestions   – output of checkAndReschedule().suggestions
 *   pullForward   – output of suggestPullForward()
 *   onApplied     – async () => void  (reload tasks after changes)
 */
function RescheduleReviewPanel({ isOpen, onClose, suggestions = [], pullForward = [], onApplied }) {
    const [accepted, setAccepted] = useState(new Set())
    const [rejected, setRejected] = useState(new Set())
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState('reschedule')

    // Reset selection state when new suggestions arrive
    useEffect(() => {
        setAccepted(new Set())
        setRejected(new Set())
    }, [suggestions, pullForward])

    const hasSuggestions = suggestions.length > 0
    const hasPullForward = pullForward.length > 0
    const pullForwardCount = pullForward.reduce((n, g) => n + g.candidates.length, 0)

    function toggleAccept(taskId) {
        setAccepted(prev => {
            const next = new Set(prev)
            next.has(taskId) ? next.delete(taskId) : next.add(taskId)
            return next
        })
        setRejected(prev => { const next = new Set(prev); next.delete(taskId); return next })
    }

    function toggleReject(taskId) {
        setRejected(prev => {
            const next = new Set(prev)
            next.has(taskId) ? next.delete(taskId) : next.add(taskId)
            return next
        })
        setAccepted(prev => { const next = new Set(prev); next.delete(taskId); return next })
    }

    async function handleApplySelected() {
        setLoading(true)
        try {
            const toApply = suggestions.filter(s => accepted.has(s.task.id))
            if (toApply.length > 0) await applyRescheduling(toApply)
            if (onApplied) await onApplied()
            onClose()
        } catch (e) {
            console.error('Error applying suggestions:', e)
        } finally {
            setLoading(false)
        }
    }

    async function handleApplyAll() {
        setLoading(true)
        try {
            await applyRescheduling(suggestions)
            if (onApplied) await onApplied()
            onClose()
        } catch (e) {
            console.error('Error applying all:', e)
        } finally {
            setLoading(false)
        }
    }

    async function handlePullForward(candidate) {
        setLoading(true)
        try {
            await updateTask(candidate.task.id, {
                scheduledDate: candidate.suggestedDate,
                autoScheduled: true
            })
            await logTaskHistory(candidate.task.id, 'rescheduled', {
                trigger: 'pull_forward',
                from: candidate.currentDate,
                to: candidate.suggestedDate
            })
            if (onApplied) await onApplied()
        } catch (e) {
            console.error('Error applying pull-forward:', e)
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

            {/* Modal */}
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col pointer-events-auto">

                    {/* Header */}
                    <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-start shrink-0">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Schedule Review</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Review suggested changes to your schedule</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 text-2xl leading-none ml-4"
                        >
                            ×
                        </button>
                    </div>

                    {/* Tabs — only shown when both types exist */}
                    {hasSuggestions && hasPullForward && (
                        <div className="flex border-b border-gray-200 px-6 shrink-0">
                            <button
                                onClick={() => setActiveTab('reschedule')}
                                className={`py-3 mr-6 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === 'reschedule'
                                        ? 'border-purple-600 text-purple-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                Rescheduling ({suggestions.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('pullforward')}
                                className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === 'pullforward'
                                        ? 'border-purple-600 text-purple-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                Pull Forward ({pullForwardCount})
                            </button>
                        </div>
                    )}

                    {/* Body */}
                    <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">

                        {/* — Reschedule suggestions — */}
                        {(!hasPullForward || activeTab === 'reschedule') && hasSuggestions && (
                            suggestions.map(s => (
                                <div
                                    key={s.task.id}
                                    className={`p-4 rounded-xl border transition-colors ${
                                        accepted.has(s.task.id)
                                            ? 'border-green-300 bg-green-50'
                                            : rejected.has(s.task.id)
                                            ? 'border-gray-200 bg-gray-50 opacity-50'
                                            : 'border-gray-200 bg-white'
                                    }`}
                                >
                                    <p className="font-medium text-gray-900 text-sm mb-2">{s.task.name}</p>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                                        <span className="line-through">{format(parseISO(s.currentDate), 'MMM d')}</span>
                                        <span>→</span>
                                        <span className="text-green-700 font-medium">
                                            {format(parseISO(s.suggestedDate), 'MMM d')}
                                        </span>
                                        <span className="ml-auto text-purple-600 font-semibold">
                                            +{s.scoreImprovement} pts
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400 mb-3">{s.reason}</p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => toggleAccept(s.task.id)}
                                            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                                accepted.has(s.task.id)
                                                    ? 'bg-green-600 text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-green-100 hover:text-green-700'
                                            }`}
                                        >
                                            {accepted.has(s.task.id) ? '✓ Accepted' : 'Accept'}
                                        </button>
                                        <button
                                            onClick={() => toggleReject(s.task.id)}
                                            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                                rejected.has(s.task.id)
                                                    ? 'bg-gray-400 text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                        >
                                            {rejected.has(s.task.id) ? 'Rejected' : 'Reject'}
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}

                        {/* — Pull-forward suggestions — */}
                        {(activeTab === 'pullforward' || !hasSuggestions) && hasPullForward && (
                            pullForward.map((group, gi) => (
                                <div key={gi}>
                                    <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-2">
                                        {format(group.period.start, 'MMM d')}–{format(group.period.end, 'MMM d')}
                                        {' '}· {group.availableSlots} open slot{group.availableSlots !== 1 ? 's' : ''}
                                    </p>
                                    {group.candidates.map((c, ci) => (
                                        <div key={ci} className="p-3 mb-2 rounded-xl border border-gray-200 bg-white flex items-start gap-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">{c.task.name}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {format(parseISO(c.currentDate), 'MMM d')}
                                                    {' → '}
                                                    <span className="text-purple-600 font-medium">
                                                        {format(parseISO(c.suggestedDate), 'MMM d')}
                                                    </span>
                                                    {' · '}{c.energyMatch} match
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handlePullForward(c)}
                                                disabled={loading}
                                                className="shrink-0 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors"
                                            >
                                                Move
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer — reschedule actions */}
                    {(!hasPullForward || activeTab === 'reschedule') && hasSuggestions && (
                        <div className="px-6 py-4 border-t border-gray-200 flex gap-3 shrink-0">
                            <button
                                onClick={handleApplySelected}
                                disabled={loading || accepted.size === 0}
                                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg disabled:opacity-40 transition-colors"
                            >
                                {loading ? 'Applying…' : `Apply Selected (${accepted.size})`}
                            </button>
                            <button
                                onClick={handleApplyAll}
                                disabled={loading}
                                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium rounded-lg disabled:opacity-40 transition-colors"
                            >
                                Apply All
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}

export default RescheduleReviewPanel
