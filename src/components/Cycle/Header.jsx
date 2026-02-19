function Header({ currentPhase, cycleDay }) {
    // Format phase name for display
    const formatPhaseName = (phase) => {
        if (!phase || phase === 'Unknown' || phase === null) return 'No Cycle Data'
        return phase.charAt(0).toUpperCase() + phase.slice(1)
    }

    return (
        <div className="bg-gradient-to-br from-purple-600 to-purple-800 text-white px-6 py-6">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-semibold">🌸 Cycle-Aware Planner</h1>
                    <span className="bg-yellow-400/90 text-yellow-900 text-xs font-semibold px-2.5 py-1 rounded-full">
                        🧪 Beta
                    </span>
                </div>
                <div className="flex items-center gap-3 bg-white/20 px-4 py-2 rounded-full text-sm">
                    <div className="w-3 h-3 rounded-full bg-purple-400"></div>
                    <span>
                        {currentPhase === 'Unknown' || currentPhase === null || !currentPhase ? (
                            'No Cycle Data - Log Your Period'
                        ) : (
                            `${formatPhaseName(currentPhase)} Phase • Day ${cycleDay}`
                        )}
                    </span>
                </div>
            </div>
            <div className="max-w-7xl mx-auto mt-2">
                <p className="text-purple-200 text-xs">Data stored locally on your device</p>
            </div>
        </div>
    )
}

export default Header

