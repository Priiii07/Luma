import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { applyRescheduling } from '../utils/reschedulingEngine'
import { updateTask, logTaskHistory } from '../utils/storageHelpers'

function RescheduleReviewPanel({ isOpen, onClose, suggestions = [], pullForward = [], onApplied }) {
    const [accepted, setAccepted] = useState(new Set())
    const [rejected, setRejected] = useState(new Set())
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState('reschedule')

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
            <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
                <div className="rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col pointer-events-auto"
                     style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>

                    {/* Header */}
                    <div className="px-6 py-5 flex justify-between items-start shrink-0"
                         style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <div>
                            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Schedule Review</h3>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Review suggested changes to your schedule</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-2xl leading-none ml-4"
                            style={{ color: 'var(--text-tertiary)' }}
                        >
                            ×
                        </button>
                    </div>

                    {/* Tabs */}
                    {hasSuggestions && hasPullForward && (
                        <div className="flex px-6 shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <button
                                onClick={() => setActiveTab('reschedule')}
                                className="py-3 mr-6 text-sm font-medium border-b-2 transition-colors"
                                style={{
                                    borderColor: activeTab === 'reschedule' ? 'var(--purple-primary)' : 'transparent',
                                    color: activeTab === 'reschedule' ? 'var(--purple-primary)' : 'var(--text-tertiary)'
                                }}
                            >
                                Rescheduling ({suggestions.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('pullforward')}
                                className="py-3 text-sm font-medium border-b-2 transition-colors"
                                style={{
                                    borderColor: activeTab === 'pullforward' ? 'var(--purple-primary)' : 'transparent',
                                    color: activeTab === 'pullforward' ? 'var(--purple-primary)' : 'var(--text-tertiary)'
                                }}
                            >
                                Pull Forward ({pullForwardCount})
                            </button>
                        </div>
                    )}

                    {/* Body */}
                    <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">

                        {/* Reschedule suggestions */}
                        {(!hasPullForward || activeTab === 'reschedule') && hasSuggestions && (
                            suggestions.map(s => (
                                <div
                                    key={s.task.id}
                                    className="p-4 rounded-xl transition-colors"
                                    style={{
                                        border: `1px solid ${accepted.has(s.task.id) ? 'rgba(74,222,128,0.4)' : rejected.has(s.task.id) ? 'var(--border-subtle)' : 'var(--border-subtle)'}`,
                                        background: accepted.has(s.task.id) ? 'rgba(74,222,128,0.08)' : rejected.has(s.task.id) ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.03)',
                                        opacity: rejected.has(s.task.id) ? 0.5 : 1
                                    }}
                                >
                                    <p className="font-medium text-sm mb-2" style={{ color: 'var(--text-primary)' }}>{s.task.name}</p>
                                    <div className="flex items-center gap-2 text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>
                                        <span className="line-through">{format(parseISO(s.currentDate), 'MMM d')}</span>
                                        <span>→</span>
                                        <span className="font-medium" style={{ color: '#4ade80' }}>
                                            {format(parseISO(s.suggestedDate), 'MMM d')}
                                        </span>
                                        <span className="ml-auto font-semibold" style={{ color: 'var(--purple-primary)' }}>
                                            +{s.scoreImprovement} pts
                                        </span>
                                    </div>
                                    <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>{s.reason}</p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => toggleAccept(s.task.id)}
                                            className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors"
                                            style={{
                                                background: accepted.has(s.task.id) ? '#4ade80' : 'rgba(255,255,255,0.05)',
                                                color: accepted.has(s.task.id) ? '#000' : 'var(--text-secondary)'
                                            }}
                                        >
                                            {accepted.has(s.task.id) ? '✓ Accepted' : 'Accept'}
                                        </button>
                                        <button
                                            onClick={() => toggleReject(s.task.id)}
                                            className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors"
                                            style={{
                                                background: rejected.has(s.task.id) ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                                                color: 'var(--text-secondary)'
                                            }}
                                        >
                                            {rejected.has(s.task.id) ? 'Rejected' : 'Reject'}
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}

                        {/* Pull-forward suggestions */}
                        {(activeTab === 'pullforward' || !hasSuggestions) && hasPullForward && (
                            pullForward.map((group, gi) => (
                                <div key={gi}>
                                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--purple-primary)' }}>
                                        {format(group.period.start, 'MMM d')}–{format(group.period.end, 'MMM d')}
                                        {' '}· {group.availableSlots} open slot{group.availableSlots !== 1 ? 's' : ''}
                                    </p>
                                    {group.candidates.map((c, ci) => (
                                        <div key={ci} className="p-3 mb-2 rounded-xl flex items-start gap-3"
                                             style={{ border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)' }}>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{c.task.name}</p>
                                                <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                                                    {format(parseISO(c.currentDate), 'MMM d')}
                                                    {' → '}
                                                    <span className="font-medium" style={{ color: 'var(--purple-primary)' }}>
                                                        {format(parseISO(c.suggestedDate), 'MMM d')}
                                                    </span>
                                                    {' · '}{c.energyMatch} match
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handlePullForward(c)}
                                                disabled={loading}
                                                className="shrink-0 px-3 py-1.5 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors"
                                                style={{ background: 'var(--purple-primary)' }}
                                            >
                                                Move
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {(!hasPullForward || activeTab === 'reschedule') && hasSuggestions && (
                        <div className="px-6 py-4 flex gap-3 shrink-0" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                            <button
                                onClick={handleApplySelected}
                                disabled={loading || accepted.size === 0}
                                className="flex-1 py-2.5 text-white text-sm font-medium rounded-lg disabled:opacity-40 transition-colors"
                                style={{ background: 'linear-gradient(135deg, var(--purple-primary), var(--purple-dark))' }}
                            >
                                {loading ? 'Applying…' : `Apply Selected (${accepted.size})`}
                            </button>
                            <button
                                onClick={handleApplyAll}
                                disabled={loading}
                                className="flex-1 py-2.5 text-sm font-medium rounded-lg disabled:opacity-40 transition-colors"
                                style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)' }}
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
