import { format } from 'date-fns'
import Navigation from '../Calendar/Navigation'
import Legend from '../Calendar/Legend'
import Calendar from '../Calendar/Calendar'

function CalendarTab({
    currentDate, cycles, tasks, isOnboarded, cyclesLogged,
    onPrevMonth, onNextMonth, onAddTask, onLogPeriod,
    onTaskClick, onTaskMoved, onDayClick, onTabChange
}) {
    return (
        <div className="flex-1 flex flex-col">
            {/* Page-level sub-header */}
            <div className="calendar-sub-header">
                <span className="calendar-sub-title">Calendar</span>
                <div className="calendar-sub-actions">
                    <button
                        className="calendar-settings-btn"
                        onClick={() => onTabChange && onTabChange('profile')}
                        title="Settings"
                    >
                        ⚙️
                    </button>
                </div>
            </div>

            <Navigation
                month={format(currentDate, 'MMMM')}
                year={format(currentDate, 'yyyy')}
                onPrevMonth={onPrevMonth}
                onNextMonth={onNextMonth}
                onAddTask={onAddTask}
                onLogPeriod={onLogPeriod}
                onOpenSettings={() => onTabChange && onTabChange('profile')}
                isOnboarded={isOnboarded}
                cyclesLogged={cyclesLogged}
            />
            <Legend />
            <Calendar
                key={cycles.map(c => c.id + c.startDate).join(',')}
                currentDate={currentDate}
                cycles={cycles}
                tasks={tasks}
                onTaskClick={onTaskClick}
                onTaskMoved={onTaskMoved}
                onDayClick={onDayClick}
            />
        </div>
    )
}

export default CalendarTab
