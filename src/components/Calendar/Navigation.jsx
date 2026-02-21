function Navigation({ month, year, onPrevMonth, onNextMonth, onAddTask, onLogPeriod, onOpenSettings, isOnboarded = true, cyclesLogged = 0 }) {
    return (
        <div
            className="flex justify-between items-center px-6 py-5"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
            <div className="flex items-center gap-4">
                <button
                    onClick={onPrevMonth}
                    className="px-2 py-1 rounded text-xl transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                    ‹
                </button>
                <h2 className="text-xl min-w-[180px] text-center font-medium" style={{ color: 'var(--text-primary)' }}>
                    {month} {year}
                </h2>
                <button
                    onClick={onNextMonth}
                    className="px-2 py-1 rounded text-xl transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                    ›
                </button>
            </div>
            <div className="flex gap-3 items-center">
                {/* Settings gear */}
                <button
                    onClick={onOpenSettings}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    title="Settings"
                    aria-label="Open settings"
                >
                    ⚙️
                </button>

                <button
                    onClick={onLogPeriod}
                    className="px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                    style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--border-medium)',
                        color: 'var(--text-primary)'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                >
                    📅 Log Period
                </button>

                {isOnboarded ? (
                    <button
                        onClick={onAddTask}
                        className="px-5 py-2.5 text-white rounded-lg text-sm font-medium transition-all"
                        style={{
                            background: 'linear-gradient(135deg, var(--purple-primary), var(--purple-dark))',
                            boxShadow: '0 2px 12px var(--purple-glow)'
                        }}
                    >
                        + Add Task
                    </button>
                ) : (
                    <div className="relative group">
                        <button
                            disabled
                            className="px-5 py-2.5 rounded-lg text-sm font-medium cursor-not-allowed"
                            style={{
                                background: 'rgba(255,255,255,0.04)',
                                color: 'var(--text-tertiary)'
                            }}
                        >
                            + Add Task
                        </button>
                        <div className="absolute right-0 top-full mt-2 w-52 text-xs rounded-lg px-3 py-2
                                        opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center"
                             style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                            Log {2 - cyclesLogged} more period{2 - cyclesLogged !== 1 ? 's' : ''} to unlock task scheduling
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Navigation
