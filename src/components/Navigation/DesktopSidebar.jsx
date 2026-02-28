import { calculateAverageCycleLength, predictNextPeriod } from '../../utils/cycleHelpers'
import { format } from 'date-fns'
import MiniCalendar from '../MiniCalendar'
import QuickStats from '../QuickStats'

const phaseColors = {
    menstrual: 'rgba(200,60,80,0.8)',
    follicular: 'rgba(210,140,40,0.8)',
    ovulation: 'rgba(160,70,220,0.8)',
    luteal: 'rgba(100,100,130,0.8)'
}

const phaseDescriptions = {
    menstrual: 'Rest & Reflect',
    follicular: 'Building Energy',
    ovulation: 'Peak Energy',
    luteal: 'Prep Week'
}

function DesktopSidebar({ currentPhaseInfo, cycles, tasks, isOnboarded, onLogPeriod, onAddTask }) {
    const phase = currentPhaseInfo?.phase
    const cycleDay = currentPhaseInfo?.cycleDay

    const formatPhaseName = (p) => {
        if (!p || p === 'Unknown') return 'No Cycle Data'
        return p.charAt(0).toUpperCase() + p.slice(1)
    }

    const avgLength = cycles.length >= 2 ? calculateAverageCycleLength(cycles) : null
    const latestCycle = cycles.length > 0
        ? cycles.reduce((a, b) => a.startDate > b.startDate ? a : b)
        : null
    const nextPrediction = latestCycle && avgLength
        ? predictNextPeriod(latestCycle.startDate, avgLength)
        : null

    return (
        <aside className="desktop-sidebar">
            {/* Current Phase */}
            <div className="desktop-sidebar-section">
                <h4>Current Phase</h4>
                <div className="phase-card">
                    <div className="phase-name">
                        <span style={{
                            width: 10, height: 10, borderRadius: '50%',
                            background: phaseColors[phase] || 'var(--text-tertiary)',
                            display: 'inline-block'
                        }} />
                        {formatPhaseName(phase)}
                        {cycleDay ? ` \u00B7 Day ${cycleDay}` : ''}
                    </div>
                    {phase && phase !== 'Unknown' && phaseDescriptions[phase] && (
                        <div className="phase-day">{phaseDescriptions[phase]}</div>
                    )}
                </div>
            </div>

            {/* Cycle Stats */}
            <div className="desktop-sidebar-section">
                <h4>Cycle Info</h4>
                <div className="stat-row">
                    <span className="stat-label">Cycles logged</span>
                    <span className="stat-value">{cycles.length}</span>
                </div>
                {avgLength && (
                    <div className="stat-row">
                        <span className="stat-label">Avg length</span>
                        <span className="stat-value">{avgLength} days</span>
                    </div>
                )}
                {latestCycle && (
                    <div className="stat-row">
                        <span className="stat-label">Last period</span>
                        <span className="stat-value">{format(new Date(latestCycle.startDate), 'MMM d')}</span>
                    </div>
                )}
                {nextPrediction && (
                    <div className="stat-row">
                        <span className="stat-label">Next predicted</span>
                        <span className="stat-value">{format(new Date(nextPrediction), 'MMM d')}</span>
                    </div>
                )}
            </div>

            {/* Quick Stats */}
            {isOnboarded && tasks && tasks.length > 0 && (
                <div className="desktop-sidebar-section">
                    <h4>Quick Stats</h4>
                    <QuickStats tasks={tasks} />
                </div>
            )}

            {/* Mini Calendar */}
            {isOnboarded && (
                <div className="desktop-sidebar-section">
                    <h4>Mini Calendar</h4>
                    <MiniCalendar cycles={cycles} tasks={tasks} />
                </div>
            )}

            {/* Actions */}
            <div className="desktop-sidebar-section">
                <button className="sidebar-btn sidebar-btn-secondary" onClick={onLogPeriod}>
                    📅 Log Period
                </button>
                {isOnboarded && (
                    <button className="sidebar-btn sidebar-btn-primary" onClick={onAddTask}>
                        + Add Task
                    </button>
                )}
            </div>
        </aside>
    )
}

export default DesktopSidebar
