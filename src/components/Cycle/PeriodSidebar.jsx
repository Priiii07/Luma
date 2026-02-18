import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { logCycle, updateAllCycleLengths, getCycleStats, db } from '../../utils/storageHelpers'

function PeriodSidebar({ isOpen, onClose, onCycleLogged, cycles = [] }) {
    const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [endDate, setEndDate] = useState('')
    const [cycleStats, setCycleStats] = useState(null)
    const [loading, setLoading] = useState(false)
    // Holds the existing cycle if user tries to log a duplicate month
    const [duplicateWarning, setDuplicateWarning] = useState(null)

    // Load cycle statistics when sidebar opens
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

    // Core save logic — called both on first submit (no duplicate) and after user confirms replace
    const saveCycle = async () => {
        setLoading(true)
        try {
            await logCycle({ startDate, endDate: endDate || null })
            await updateAllCycleLengths()
            if (onCycleLogged) await onCycleLogged()
            setStartDate(format(new Date(), 'yyyy-MM-dd'))
            setEndDate('')
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

        // Check for a same-month entry (non-overlapping duplicates slip past the DB overlap check)
        const newMonth = startDate.substring(0, 7) // 'YYYY-MM'
        const existing = cycles.find(c => c.startDate.substring(0, 7) === newMonth)

        if (existing) {
            // Pause and ask the user what to do
            setDuplicateWarning(existing)
            return
        }

        await saveCycle()
    }

    // User chose to replace the existing entry
    const handleConfirmReplace = async () => {
        // Delete the duplicate from DB before calling logCycle so there's no conflict
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
                    className="fixed inset-0 bg-black/20 z-40"
                    onMouseDown={onClose}
                ></div>
            )}

            {/* Sidebar */}
            <div className={`
        fixed right-0 top-0 w-96 h-screen bg-white shadow-2xl z-50
        transition-transform duration-300 overflow-y-auto
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
                <div className="px-6 py-6 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-800">Log Period</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                    >
                        ×
                    </button>
                </div>

                <div className="px-6 py-6">
                    {/* Duplicate month confirmation prompt */}
                    {duplicateWarning && (
                        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                            <p className="text-sm font-medium text-amber-900 mb-1">
                                Period already logged for this month
                            </p>
                            <p className="text-xs text-amber-700 mb-4">
                                You already have a period logged starting{' '}
                                <strong>{format(parseISO(duplicateWarning.startDate), 'MMM d, yyyy')}</strong>.
                                Replace it with the new dates?
                            </p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={handleConfirmReplace}
                                    disabled={loading}
                                    className="flex-1 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {loading ? 'Replacing...' : 'Replace'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDuplicateWarning(null)}
                                    className="flex-1 px-3 py-2 bg-white border border-gray-300 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="mb-5">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Period Start Date *
                            </label>
                            <input
                                type="date"
                                required
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm
                         focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                            />
                            <div className="text-xs text-gray-500 mt-1">
                                This resets your cycle to Day 1
                            </div>
                        </div>

                        <div className="mb-5">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Period End Date (Optional)
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm
                         focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                            />
                            <div className="text-xs text-gray-500 mt-1">
                                Helps us predict your cycle better
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white 
                       rounded-lg text-sm font-medium transition-colors mt-6 disabled:opacity-50"
                        >
                            {loading ? 'Logging...' : 'Log Period'}
                        </button>

                        {/* Cycle Stats */}
                        {cycleStats && cycleStats.totalCyclesLogged > 0 && (
                            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                                <div className="text-sm font-medium text-gray-800 mb-2">
                                    Your Cycle Stats
                                </div>
                                <div className="text-sm text-gray-600 leading-relaxed">
                                    Average cycle length: {cycleStats.averageCycleLength} days<br />
                                    Average period duration: {cycleStats.averagePeriodDuration} days<br />
                                    Last period: {cycleStats.lastPeriodDate ? format(new Date(cycleStats.lastPeriodDate), 'MMM d, yyyy') : 'N/A'}<br />
                                    Predicted next: {cycleStats.predictedNextPeriod ? format(new Date(cycleStats.predictedNextPeriod), 'MMM d, yyyy') : 'N/A'}
                                </div>
                            </div>
                        )}

                        {cycleStats && cycleStats.totalCyclesLogged === 0 && (
                            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                                <div className="text-sm text-blue-800">
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

