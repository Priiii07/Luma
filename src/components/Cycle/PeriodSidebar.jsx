import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { logCycle, updateAllCycleLengths, getCycleStats } from '../../utils/storageHelpers'

function PeriodSidebar({ isOpen, onClose, onCycleLogged }) {
    const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [endDate, setEndDate] = useState('')
    const [cycleStats, setCycleStats] = useState(null)
    const [loading, setLoading] = useState(false)

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

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            // Log the cycle
            await logCycle({
                startDate,
                endDate: endDate || null
            })

            // Update cycle lengths for all cycles
            await updateAllCycleLengths()

            // Notify parent component and wait for it to complete
            if (onCycleLogged) {
                await onCycleLogged() // ✅ Await to ensure state updates complete
            }

            // Reset form
            setStartDate(format(new Date(), 'yyyy-MM-dd'))
            setEndDate('')

            // Reload stats
            await loadStats()

            onClose()
        } catch (error) {
            console.error('Error logging period:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            {/* Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 z-40"
                    onClick={onClose}
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

