function Header({ currentPhase, cycleDay }) {
    // Format phase name for display
    const formatPhaseName = (phase) => {
        if (!phase || phase === 'Unknown' || phase === null) return 'No Cycle Data'
        return phase.charAt(0).toUpperCase() + phase.slice(1)
    }

    const phaseIndicatorColors = {
        menstrual: 'rgba(200,60,80,0.8)',
        follicular: 'rgba(210,140,40,0.8)',
        ovulation: 'rgba(160,70,220,0.8)',
        luteal: 'rgba(100,100,130,0.8)'
    }

    return (
        <div
            className="px-6 py-6"
            style={{
                background: 'linear-gradient(135deg, rgba(198,120,221,0.15), rgba(220,100,60,0.08))',
                borderBottom: '1px solid var(--border-subtle)',
                backdropFilter: 'blur(20px)'
            }}
        >
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-serif italic" style={{ color: 'var(--text-primary)' }}>
                        🌸 Cycle-Aware Planner
                    </h1>
                    <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{
                            background: 'rgba(220,100,60,0.2)',
                            color: 'var(--terracotta)',
                            border: '1px solid rgba(220,100,60,0.3)'
                        }}
                    >
                        🧪 Beta
                    </span>
                </div>
                <div
                    className="flex items-center gap-3 px-4 py-2 rounded-full text-sm"
                    style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-secondary)'
                    }}
                >
                    <div
                        className="w-3 h-3 rounded-full"
                        style={{ background: phaseIndicatorColors[currentPhase] || 'rgba(255,255,255,0.3)' }}
                    />
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
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    Data stored locally on your device
                </p>
            </div>
        </div>
    )
}

export default Header
