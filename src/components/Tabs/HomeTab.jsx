import { format } from 'date-fns'
import SmartBanner from '../Task/SmartBanner'
import OverloadBanner from '../OverloadBanner'
import MissedInstanceBanner from '../MissedInstanceBanner'
import InsightBanner from '../InsightBanner'
import WeekPreview from '../WeekPreview'
import TaskCard from './TaskCard'
import { generateInsights } from '../../utils/insightEngine'

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

function HomeTab({
    currentPhaseInfo, tasks, cycles, warnings, missedInstances,
    pullForwardSuggestions, showReviewPanel, rescheduleNotification,
    isOnboarded, onAddTask, onTaskClick, onToggleComplete,
    onDismissWarning, onMissedReschedule, onMissedDismiss,
    onSetRescheduleNotification, onOpenReviewPanel, onTabChange
}) {
    const today = format(new Date(), 'yyyy-MM-dd')
    const todayTasks = tasks.filter(t => t.scheduledDate === today)
    const incompleteTodayTasks = todayTasks.filter(t => !t.completed)
    const completedTodayTasks = todayTasks.filter(t => t.completed)

    const phase = currentPhaseInfo?.phase
    const cycleDay = currentPhaseInfo?.cycleDay

    let insights = { phaseGuidance: null, opportunities: null }
    try {
        if (cycles && cycles.length >= 2) {
            insights = generateInsights(cycles, tasks)
        }
    } catch (err) {
        console.error('Error generating insights:', err)
    }

    const formatPhaseName = (p) => {
        if (!p || p === 'Unknown') return null
        return p.charAt(0).toUpperCase() + p.slice(1)
    }

    return (
        <div className="home-tab">
            {/* Today header */}
            <div className="home-today-header">
                <div className="home-today-date">
                    {format(new Date(), 'EEEE, MMMM d')}
                </div>
                <div className="home-today-phase">
                    {phase && phase !== 'Unknown' && (
                        <>
                            <span className="phase-dot" style={{ background: phaseColors[phase] || 'var(--text-tertiary)' }} />
                            <span>
                                {formatPhaseName(phase)} Phase{cycleDay ? ` \u00B7 Day ${cycleDay}` : ''}
                                {phaseDescriptions[phase] ? ` \u00B7 ${phaseDescriptions[phase]}` : ''}
                            </span>
                        </>
                    )}
                    {(!phase || phase === 'Unknown') && (
                        <span>No cycle data yet</span>
                    )}
                </div>
            </div>

            {/* Smart banner (phase guidance) */}
            <SmartBanner phase={phase} />

            {/* Phase insight banner */}
            {insights.phaseGuidance && (
                <InsightBanner
                    type="phase"
                    icon="💡"
                    message={insights.phaseGuidance}
                    dismissible
                />
            )}

            {/* Opportunity insight banner */}
            {insights.opportunities && (
                <InsightBanner
                    type="opportunity"
                    icon="⚡"
                    message={insights.opportunities}
                    action={{
                        label: 'View Calendar',
                        onClick: () => onTabChange && onTabChange('calendar')
                    }}
                    dismissible
                />
            )}

            {/* Overload warnings */}
            <OverloadBanner warnings={warnings} onDismiss={onDismissWarning} />

            {/* Missed recurring tasks */}
            <MissedInstanceBanner
                missedInstances={missedInstances}
                onReschedule={onMissedReschedule}
                onDismiss={onMissedDismiss}
            />

            {/* Auto-reschedule toast */}
            {rescheduleNotification > 0 && (
                <div className="mx-0 mb-3 px-3 py-2 rounded flex items-center gap-2 text-xs"
                     style={{ background: 'var(--banner-purple-bg)', borderLeft: '4px solid var(--banner-purple-border)', color: 'var(--banner-purple-text)' }}>
                    <span>✨</span>
                    <span>
                        {rescheduleNotification} task{rescheduleNotification !== 1 ? 's were' : ' was'} automatically rescheduled to better match your updated cycle.
                    </span>
                    <button onClick={() => onSetRescheduleNotification(0)} className="ml-auto opacity-50 hover:opacity-80 text-xl leading-none">×</button>
                </div>
            )}

            {/* Pull-forward nudge */}
            {!showReviewPanel && pullForwardSuggestions.length > 0 && isOnboarded && (
                <div className="mx-0 mb-3 px-3 py-2 rounded flex items-center gap-2 text-xs"
                     style={{ background: 'var(--banner-info-bg)', borderLeft: '4px solid var(--banner-info-border)', color: 'var(--banner-info-text)' }}>
                    <span>💡</span>
                    <span>You have free slots in an upcoming high-energy week. Pull forward some tasks?</span>
                    <button
                        onClick={onOpenReviewPanel}
                        className="ml-auto shrink-0 px-3 py-1 text-white text-xs font-medium rounded-lg transition-colors"
                        style={{ background: 'var(--purple-primary)' }}
                    >
                        Review
                    </button>
                </div>
            )}

            {/* This Week at a Glance */}
            {isOnboarded && cycles && cycles.length >= 2 && (
                <WeekPreview
                    tasks={tasks}
                    cycles={cycles}
                    onTabChange={onTabChange}
                />
            )}

            {/* Today's tasks */}
            <div className="home-section-title">
                Today's Tasks ({todayTasks.length})
            </div>

            {todayTasks.length === 0 ? (
                <div className="home-empty">
                    <span className="home-empty-icon">✨</span>
                    <p>No tasks scheduled for today</p>
                    {isOnboarded && (
                        <button className="home-add-btn" onClick={onAddTask}>+ Add Task</button>
                    )}
                </div>
            ) : (
                <>
                    {incompleteTodayTasks.map(task => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            onTaskClick={onTaskClick}
                            onToggleComplete={onToggleComplete}
                        />
                    ))}
                    {completedTodayTasks.length > 0 && (
                        <>
                            <div className="home-section-title" style={{ marginTop: '16px' }}>
                                Completed ({completedTodayTasks.length})
                            </div>
                            {completedTodayTasks.map(task => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    onTaskClick={onTaskClick}
                                    onToggleComplete={onToggleComplete}
                                />
                            ))}
                        </>
                    )}
                </>
            )}

            {/* FAB for mobile */}
            {isOnboarded && (
                <button className="fab-add-task" onClick={onAddTask}>+</button>
            )}
        </div>
    )
}

export default HomeTab
