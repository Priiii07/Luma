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
            className="px-6 py-6"
            style={{
                background: 'var(--header-bg)',
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
                <div className="flex items-center gap-4">
                    <div
                        className="flex items-center gap-3 px-4 py-2 rounded-full text-sm"
                        style={{
                            background: 'var(--surface-2)',
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
                    {user && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs truncate max-w-[140px]"
                                  style={{ color: 'var(--text-tertiary)' }}>
                                {user.email}
                            </span>
                            <button
                                onClick={logout}
                                className="text-xs px-3 py-1.5 rounded-lg transition-colors"
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
            <div className="max-w-7xl mx-auto mt-2">
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    Synced securely to cloud
                </p>
            </div>
        </div>
    )
}

export default Header
