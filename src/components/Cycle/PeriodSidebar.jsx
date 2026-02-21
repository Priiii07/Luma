import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import DatePicker from 'react-datepicker'
import { logCycle, updateAllCycleLengths, getCycleStats, db } from '../../utils/storageHelpers'

function PeriodSidebar({ isOpen, onClose, onCycleLogged, cycles = [] }) {
    const [startDate, setStartDate] = useState(new Date())
    const [endDate, setEndDate] = useState(null)
    const [cycleStats, setCycleStats] = useState(null)
    const [loading, setLoading] = useState(false)
    const [duplicateWarning, setDuplicateWarning] = useState(null)

    useEffect(() => {
        if (isOpen) {
            loadStats()
        }
    }, [isOpen])

    const loadStats = async () => {
        try {
            const stats = await getCycleStats()
            setCycleStats(stats)
        } catch (error) {
            console.error('Error loading cycle stats:', error)
        }
    }

    const startDateStr = startDate ? format(startDate, 'yyyy-MM-dd') : ''
    const endDateStr = endDate ? format(endDate, 'yyyy-MM-dd') : null

    const saveCycle = async () => {
        setLoading(true)
        try {
            await logCycle({ startDate: startDateStr, endDate: endDateStr })
            await updateAllCycleLengths()
            if (onCycleLogged) await onCycleLogged()
            setStartDate(new Date())
            setEndDate(null)
            setDuplicateWarning(null)
            await loadStats()
            onClose()
        } catch (error) {
            console.error('Error logging period:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        const newMonth = startDateStr.substring(0, 7)
        const existing = cycles.find(c => c.startDate.substring(0, 7) === newMonth)

        if (existing) {
            setDuplicateWarning(existing)
            return
        }

        await saveCycle()
    }

    const handleConfirmReplace = async () => {
        if (duplicateWarning?.id) {
            await db.cycles.delete(duplicateWarning.id)
        }
        await saveCycle()
    }

    return (
        <>
            {/* Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-40"
                    onMouseDown={onClose}
                ></div>
            )}

            {/* Sidebar */}
            <div className={`
                fixed right-0 top-0 w-96 h-screen shadow-2xl z-50
                transition-transform duration-300 overflow-y-auto
                ${isOpen ? 'translate-x-0' : 'translate-x-full'}
            `} style={{ background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-subtle)' }}>
                <div className="px-6 py-6 flex justify-between items-center"
                     style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <h3 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>Log Period</h3>
                    <button
                        onClick={onClose}
                        className="text-2xl leading-none transition-colors"
                        style={{ color: 'var(--text-tertiary)' }}
                    >
                        ×
                    </button>
                </div>

                <div className="px-6 py-6">
                    {/* Duplicate month confirmation prompt */}
                    {duplicateWarning && (
                        <div className="mb-6 p-4 rounded-xl"
                             style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)' }}>
                            <p className="text-sm font-medium mb-1" style={{ color: 'rgba(253,224,71,0.9)' }}>
                                Period already logged for this month
                            </p>
                            <p className="text-xs mb-4" style={{ color: 'rgba(251,191,36,0.7)' }}>
                                You already have a period logged starting{' '}
                                <strong>{format(parseISO(duplicateWarning.startDate), 'MMM d, yyyy')}</strong>.
                                Replace it with the new dates?
                            </p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={handleConfirmReplace}
                                    disabled={loading}
                                    className="flex-1 px-3 py-2 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                                    style={{ background: 'rgba(251,191,36,0.6)' }}
                                >
                                    {loading ? 'Replacing...' : 'Replace'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDuplicateWarning(null)}
                                    className="flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-medium)', color: 'var(--text-secondary)' }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="mb-5">
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                                Period Start Date *
                            </label>
                            <DatePicker
                                selected={startDate}
                                onChange={(date) => setStartDate(date)}
                                dateFormat="MMM d, yyyy"
                                maxDate={new Date()}
                                className="w-full px-3 py-2.5 rounded-md text-sm focus:outline-none"
                                placeholderText="Select start date"
                                required
                            />
                            <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                                This resets your cycle to Day 1
                            </div>
                        </div>

                        <div className="mb-5">
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                                Period End Date (Optional)
                            </label>
                            <DatePicker
                                selected={endDate}
                                onChange={(date) => setEndDate(date)}
                                dateFormat="MMM d, yyyy"
                                minDate={startDate}
                                maxDate={new Date()}
                                className="w-full px-3 py-2.5 rounded-md text-sm focus:outline-none"
                                placeholderText="Select end date"
                                isClearable
                            />
                            <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                                Helps us predict your cycle better
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full px-5 py-2.5 text-white rounded-lg text-sm font-medium transition-all mt-6 disabled:opacity-50"
                            style={{
                                background: 'linear-gradient(135deg, var(--purple-primary), var(--purple-dark))',
                                boxShadow: '0 2px 12px var(--purple-glow)'
                            }}
                        >
                            {loading ? 'Logging...' : 'Log Period'}
                        </button>

                        {/* Cycle Stats */}
                        {cycleStats && cycleStats.totalCyclesLogged > 0 && (
                            <div className="mt-6 p-4 rounded-lg"
                                 style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)' }}>
                                <div className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                                    Your Cycle Stats
                                </div>
                                <div className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                    Average cycle length: {cycleStats.averageCycleLength} days<br />
                                    Average period duration: {cycleStats.averagePeriodDuration} days<br />
                                    Last period: {cycleStats.lastPeriodDate ? format(new Date(cycleStats.lastPeriodDate), 'MMM d, yyyy') : 'N/A'}<br />
                                    Predicted next: {cycleStats.predictedNextPeriod ? format(new Date(cycleStats.predictedNextPeriod), 'MMM d, yyyy') : 'N/A'}
                                </div>
                            </div>
                        )}

                        {cycleStats && cycleStats.totalCyclesLogged === 0 && (
                            <div className="mt-6 p-4 rounded-lg"
                                 style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)' }}>
                                <div className="text-sm" style={{ color: 'rgba(147,197,253,0.9)' }}>
                                    💡 Log your first period to start tracking your cycle!
                                </div>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </>
    )
}

export default PeriodSidebar
