import { useAuth } from '../../contexts/AuthContext'

function Header({ currentPhase, cycleDay, activeTab, onTabChange }) {
    const { user } = useAuth()

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

    const tabs = [
        { id: 'home', label: 'Home' },
        { id: 'calendar', label: 'Calendar' },
        { id: 'tasks', label: 'Tasks' },
        { id: 'profile', label: 'Profile' }
    ]

    return (
        <div
            className="px-3 py-2.5 md:px-6 md:py-3"
            style={{
                background: 'var(--header-bg)',
                borderBottom: '1px solid var(--border-subtle)',
                backdropFilter: 'blur(20px)'
            }}
        >
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                {/* Left: Logo + Desktop tabs */}
                <div className="flex items-center gap-3 md:gap-8">
                    <div className="flex items-center gap-2">
                        <h1 className="text-base md:text-xl font-serif italic" style={{ color: 'var(--text-primary)' }}>
                            🌸 Cycle Planner
                        </h1>
                        <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                            style={{
                                background: 'rgba(220,100,60,0.2)',
                                color: 'var(--terracotta)',
                                border: '1px solid rgba(220,100,60,0.3)'
                            }}
                        >
                            Beta
                        </span>
                    </div>

                    {/* Desktop tab navigation */}
                    <div className="header-tabs">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                className={`header-tab ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => onTabChange(tab.id)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right: Phase indicator + user info (desktop) */}
                <div className="flex items-center gap-2 md:gap-3">
                    <div
                        className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 rounded-full text-[11px] md:text-xs"
                        style={{
                            background: 'var(--surface-2)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-secondary)'
                        }}
                    >
                        <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: phaseIndicatorColors[currentPhase] || 'rgba(255,255,255,0.3)' }}
                        />
                        <span className="truncate max-w-[100px] md:max-w-none">
                            {currentPhase === 'Unknown' || currentPhase === null || !currentPhase ? (
                                'No Cycle Data'
                            ) : (
                                `${formatPhaseName(currentPhase)} • Day ${cycleDay}`
                            )}
                        </span>
                    </div>
                    {user && (
                        <span className="hidden md:inline text-xs truncate max-w-[120px]"
                              style={{ color: 'var(--text-tertiary)' }}>
                            {user.email}
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Header
