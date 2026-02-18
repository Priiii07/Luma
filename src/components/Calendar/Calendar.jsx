import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import CalendarDay from './CalendarDay'
import { getMonthDates, isToday as checkIsToday } from '../../utils/dateHelpers'
import { format, isSameMonth, isPast, startOfDay } from 'date-fns'
import { getPhaseForDateAdvanced, calculateAverageCycleLength, predictNextPeriod } from '../../utils/cycleHelpers'

function Calendar({ currentDate = new Date(), cycles = [], tasks = [], onTaskClick, onTaskMoved }) {
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    // Generate dates for the calendar grid
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const monthDates = getMonthDates(year, month)

    // Calculate average cycle length for predictions
    const avgCycleLength = calculateAverageCycleLength(cycles)

    // Get predicted next period if we have cycles
    let predictedDate = null
    if (cycles.length > 0) {
        const latestCycle = cycles[0] // Already sorted by startDate descending
        predictedDate = predictNextPeriod(latestCycle.startDate, avgCycleLength)
    }

    // Get today's date string for comparison
    const todayStr = format(new Date(), 'yyyy-MM-dd')

    // Generate calendar days with advanced phase calculation
    const calendarDays = monthDates.map(date => {
        const dayNumber = date.getDate()
        const isCurrentMonth = isSameMonth(date, currentDate)
        const dateStr = format(date, 'yyyy-MM-dd')

        // Use ADVANCED phase calculation (retroactive + predictive)
        const phase = getPhaseForDateAdvanced(date, cycles, avgCycleLength)

        // Check if this is today
        const isToday = dateStr === todayStr

        // Check if this is the predicted period date
        const isPredicted = dateStr === predictedDate

        // Filter tasks for this date
        const dayTasks = tasks.filter(task => task.scheduledDate === dateStr)

        return {
            date: dayNumber,
            fullDate: date,
            phase: phase || 'luteal',
            isOtherMonth: !isCurrentMonth,
            isToday,
            isPredicted,
            tasks: dayTasks
        }
    })

    // Require 8px drag distance before activating (avoids accidental drags on click)
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    )

    const handleDayClick = (day) => {
        console.log('Day clicked:', format(day.fullDate, 'yyyy-MM-dd'))
    }

    const handleDragEnd = (event) => {
        const { active, over } = event
        if (!over) return

        const task = active.data.current?.task
        const targetDateStr = over.data.current?.dateStr
        if (!task || !targetDateStr) return

        // Don't move to same day
        if (task.scheduledDate === targetDateStr) return

        // Block: past dates
        const targetDate = new Date(targetDateStr + 'T00:00:00')
        if (isPast(startOfDay(targetDate)) && startOfDay(targetDate) < startOfDay(new Date())) return

        if (onTaskMoved) onTaskMoved(task, targetDateStr)
    }

    return (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="px-6 py-6">
                {/* Weekday headers */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                    {weekdays.map(day => (
                        <div key={day} className="text-center text-xs font-semibold text-gray-500 uppercase p-2">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-2">
                    {calendarDays.map((day, index) => (
                        <CalendarDay
                            key={index}
                            date={day.date}
                            fullDate={day.fullDate}
                            phase={day.phase}
                            isOtherMonth={day.isOtherMonth}
                            isToday={day.isToday}
                            tasks={day.tasks}
                            onClick={() => handleDayClick(day)}
                            onTaskClick={onTaskClick}
                        />
                    ))}
                </div>
            </div>
        </DndContext>
    )
}

export default Calendar