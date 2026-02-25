import { useAuth } from '../../contexts/AuthContext'

function Header({ currentPhase, cycleDay }) {
    const { user, logout } = useAuth()

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
            className="px-3 py-3 md:px-6 md:py-6"
            style={{
                background: 'var(--header-bg)',
                borderBottom: '1px solid var(--border-subtle)',
                backdropFilter: 'blur(20px)'
            }}
        >
            <div className="max-w-7xl mx-auto flex flex-wrap md:flex-nowrap justify-between items-center gap-2 md:gap-0">
                <div className="flex items-center gap-2 md:gap-3">
                    <h1 className="text-base md:text-2xl font-serif italic" style={{ color: 'var(--text-primary)' }}>
                        🌸 Cycle Planner
                    </h1>
                    <span
                        className="text-[10px] md:text-xs font-semibold px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-full"
                        style={{
                            background: 'rgba(220,100,60,0.2)',
                            color: 'var(--terracotta)',
                            border: '1px solid rgba(220,100,60,0.3)'
                        }}
                    >
                        Beta
                    </span>
                </div>
                <div className="flex items-center gap-2 md:gap-4">
                    <div
                        className="flex items-center gap-1.5 md:gap-3 px-2 md:px-4 py-1 md:py-2 rounded-full text-[11px] md:text-sm"
                        style={{
                            background: 'var(--surface-2)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-secondary)'
                        }}
                    >
                        <div
                            className="w-2 h-2 md:w-3 md:h-3 rounded-full shrink-0"
                            style={{ background: phaseIndicatorColors[currentPhase] || 'rgba(255,255,255,0.3)' }}
                        />
                        <span className="truncate max-w-[120px] md:max-w-none">
                            {currentPhase === 'Unknown' || currentPhase === null || !currentPhase ? (
                                'No Cycle Data'
                            ) : (
                                `${formatPhaseName(currentPhase)} • Day ${cycleDay}`
                            )}
                        </span>
                    </div>
                    {user && (
                        <div className="flex items-center gap-1.5 md:gap-2">
                            <span className="hidden md:inline text-xs truncate max-w-[140px]"
                                  style={{ color: 'var(--text-tertiary)' }}>
                                {user.email}
                            </span>
                            <button
                                onClick={logout}
                                className="text-[10px] md:text-xs px-2 md:px-3 py-1 md:py-1.5 rounded-lg transition-colors"
                                style={{
                                    background: 'var(--surface-2)',
                                    border: '1px solid var(--border-subtle)',
                                    color: 'var(--text-secondary)'
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.borderColor = 'var(--purple-primary)'
                                    e.currentTarget.style.color = 'var(--purple-primary)'
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.borderColor = 'var(--border-subtle)'
                                    e.currentTarget.style.color = 'var(--text-secondary)'
                                }}
                            >
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <div className="max-w-7xl mx-auto mt-1 md:mt-2 hidden md:block">
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    Synced securely to cloud
                </p>
            </div>
        </div>
    )
}

export default Header
