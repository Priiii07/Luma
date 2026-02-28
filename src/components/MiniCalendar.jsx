import { useState } from 'react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth } from 'date-fns'
import { getPhaseForDateAdvanced } from '../utils/cycleHelpers'

const phaseColors = {
    menstrual: 'rgba(200,60,80,0.6)',
    follicular: 'rgba(210,140,40,0.5)',
    ovulation: 'rgba(160,70,220,0.5)',
    luteal: 'rgba(100,100,130,0.4)'
}

export default function MiniCalendar({ cycles, tasks }) {
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const today = format(new Date(), 'yyyy-MM-dd')

    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

    const days = []
    let day = calStart
    while (day <= calEnd) {
        days.push(day)
        day = addDays(day, 1)
    }

    const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

    return (
        <div className="mini-calendar">
            <div className="mini-calendar-header">
                <button className="mini-calendar-nav" onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}>‹</button>
                <span className="mini-calendar-month">{format(currentMonth, 'MMM yyyy')}</span>
                <button className="mini-calendar-nav" onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}>›</button>
            </div>
            <div className="mini-calendar-grid">
                {weekDays.map((d, i) => (
                    <div key={i} className="mini-calendar-weekday">{d}</div>
                ))}
                {days.map(d => {
                    const dateStr = format(d, 'yyyy-MM-dd')
                    const inMonth = isSameMonth(d, currentMonth)
                    const isToday = dateStr === today
                    let phase = null
                    try { phase = cycles && cycles.length > 0 ? getPhaseForDateAdvanced(dateStr, cycles) : null } catch { /* ignore */ }
                    const taskCount = tasks ? tasks.filter(t => t.scheduledDate === dateStr && !t.completed).length : 0

                    return (
                        <div
                            key={dateStr}
                            className={`mini-calendar-day ${!inMonth ? 'outside' : ''} ${isToday ? 'today' : ''}`}
                            style={phase && inMonth ? { background: phaseColors[phase] } : undefined}
                        >
                            <span>{format(d, 'd')}</span>
                            {taskCount > 0 && inMonth && <span className="mini-calendar-dot" />}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
