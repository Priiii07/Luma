import DraggableTask from './DraggableTask'
import DroppableCalendarDay from './DroppableCalendarDay'

function CalendarDay({ date, fullDate, phase, isOtherMonth, isToday, tasks, onClick, onTaskClick }) {
    const phaseStyles = {
        menstrual: { background: 'var(--phase-menstrual)', border: 'var(--phase-menstrual-border)' },
        follicular: { background: 'var(--phase-follicular)', border: 'var(--phase-follicular-border)' },
        ovulation: { background: 'var(--phase-ovulation)', border: 'var(--phase-ovulation-border)' },
        luteal: { background: 'var(--phase-luteal)', border: 'var(--phase-luteal-border)' }
    }

    const energyColors = {
        high: 'rgba(198,120,221,0.7)',
        medium: 'rgba(220,140,60,0.7)',
        low: 'rgba(80,160,220,0.7)'
    }

    // Format fullDate to ISO for droppable ID
    const dateStr = fullDate
        ? `${fullDate.getFullYear()}-${String(fullDate.getMonth() + 1).padStart(2, '0')}-${String(fullDate.getDate()).padStart(2, '0')}`
        : ''

    const ps = phaseStyles[phase] || phaseStyles.luteal

    return (
        <DroppableCalendarDay dateStr={dateStr}>
            <div
                onClick={onClick}
                className={`
                    min-h-[100px] rounded-lg p-2 relative cursor-pointer transition-all
                    hover:brightness-110
                    ${isOtherMonth ? 'opacity-30' : ''}
                `}
                style={{
                    background: ps.background,
                    border: isToday ? `3px solid ${ps.border}` : `1px solid ${ps.border}`,
                    boxShadow: isToday ? `0 0 20px ${ps.background}, 0 8px 16px rgba(0,0,0,0.3)` : 'none'
                }}
            >
                <div
                    className="inline-block font-semibold text-sm mb-1 px-2 py-1 rounded"
                    style={{
                        color: 'var(--text-primary)',
                        background: isToday ? 'var(--surface-3)' : (tasks && tasks.length > 0 ? 'var(--surface-hover)' : 'transparent'),
                        border: tasks && tasks.length > 0 ? '1px solid var(--border-medium)' : 'none'
                    }}
                >
                    {date}
                </div>

                {tasks && tasks.map((task, index) => (
                    <DraggableTask key={task.id ?? index} task={task}>
                        <div
                            onClick={(e) => { e.stopPropagation(); onTaskClick?.(task) }}
                            className={`
                                text-xs px-2 py-1 rounded mt-1
                                overflow-hidden text-ellipsis whitespace-nowrap
                                transition-all cursor-pointer
                                ${task.completed ? 'line-through opacity-60' : ''}
                            `}
                            style={{
                                background: 'var(--surface-2)',
                                color: 'var(--text-primary)',
                                borderLeft: `3px solid ${energyColors[task.energyLevel] || 'rgba(255,255,255,0.2)'}`,
                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'var(--purple-glow)'
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)'
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'var(--surface-2)'
                                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)'
                            }}
                        >
                            {task.name}
                        </div>
                    </DraggableTask>
                ))}
            </div>
        </DroppableCalendarDay>
    )
}

export default CalendarDay
