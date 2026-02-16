function CalendarDay({ date, phase, isOtherMonth, isToday, tasks, onClick }) {
    const phaseColors = {
        menstrual: 'bg-pink-200',
        follicular: 'bg-orange-100',
        ovulation: 'bg-purple-200',
        luteal: 'bg-gray-200'
    }

    const phaseBorderColors = {
        menstrual: 'border-pink-400',
        follicular: 'border-orange-400',
        ovulation: 'border-purple-400',
        luteal: 'border-gray-400'
    }

    const energyColors = {
        high: 'border-l-purple-600',
        medium: 'border-l-orange-500',
        low: 'border-l-blue-500'
    }

    return (
        <div
            onClick={onClick}
            className={`
        min-h-[100px] rounded-lg p-2 relative cursor-pointer transition-all
        hover:transform hover:-translate-y-0.5 hover:shadow-lg
        ${phaseColors[phase] || 'bg-white'}
        ${isOtherMonth ? 'opacity-30' : ''}
        ${isToday ? `shadow-[0_8px_16px_rgba(0,0,0,0.15)] border-4 ${phaseBorderColors[phase] || 'border-gray-400'}` : ''}
      `}
        >
            <div className={`
        inline-block font-semibold text-sm text-gray-800 mb-1 px-2 py-1 rounded
        ${isToday ? 'bg-black/10' : ''}
        ${tasks && tasks.length > 0 ? 'border-2 border-gray-800 bg-white/50' : ''}
      `}>
                {date}
            </div>

            {tasks && tasks.map((task, index) => (
                <div
                    key={index}
                    className={`
            text-xs text-gray-700 bg-white px-2 py-1 rounded mt-1
            overflow-hidden text-ellipsis whitespace-nowrap
            shadow-sm border-l-3 ${energyColors[task.energyLevel] || 'border-l-gray-400'}
          `}
                >
                    {task.name}
                </div>
            ))}
        </div>
    )
}

export default CalendarDay
