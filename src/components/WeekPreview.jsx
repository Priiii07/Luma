import { format, addDays, startOfWeek } from 'date-fns'
import { getPhaseForDateAdvanced } from '../utils/cycleHelpers'

const phaseColors = {
    menstrual: 'rgba(200,60,80,0.8)',
    follicular: 'rgba(210,140,40,0.8)',
    ovulation: 'rgba(160,70,220,0.8)',
    luteal: 'rgba(100,100,130,0.8)'
}

const phaseLabels = {
    menstrual: 'M',
    follicular: 'F',
    ovulation: 'O',
    luteal: 'L'
}

export default function WeekPreview({ tasks, cycles, onTabChange }) {
    const today = format(new Date(), 'yyyy-MM-dd')
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }) // Monday start

    const days = Array.from({ length: 7 }, (_, i) => {
        const date = addDays(weekStart, i)
        const dateStr = format(date, 'yyyy-MM-dd')
        const dayTasks = tasks.filter(t => t.scheduledDate === dateStr && !t.completed)
        let phase = null
        try { phase = getPhaseForDateAdvanced(dateStr, cycles) } catch { /* ignore */ }
        const isToday = dateStr === today

        return {
            dateStr,
            dayLabel: format(date, 'EEE'),
            dayNum: format(date, 'd'),
            taskCount: dayTasks.length,
            phase,
            isToday
        }
    })

    return (
        <div className="week-preview">
            <div className="week-preview-header">
                <h3 className="home-section-title" style={{ margin: 0 }}>This Week</h3>
                <button
                    className="week-preview-link"
                    onClick={() => onTabChange && onTabChange('calendar')}
                >
                    View Calendar →
                </button>
            </div>
            <div className="week-preview-grid">
                {days.map(day => (
                    <div
                        key={day.dateStr}
                        className={`week-preview-day ${day.isToday ? 'today' : ''}`}
                    >
                        <span className="week-preview-day-label">{day.dayLabel}</span>
                        <span className={`week-preview-day-num ${day.isToday ? 'today' : ''}`}>
                            {day.dayNum}
                        </span>
                        {day.phase && (
                            <span
                                className="week-preview-phase"
                                style={{ background: phaseColors[day.phase] }}
                                title={day.phase}
                            >
                                {phaseLabels[day.phase]}
                            </span>
                        )}
                        {day.taskCount > 0 && (
                            <span className="week-preview-task-count">
                                {day.taskCount} task{day.taskCount !== 1 ? 's' : ''}
                            </span>
                        )}
                        {day.taskCount === 0 && (
                            <span className="week-preview-task-count empty">—</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
