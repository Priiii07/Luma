function Navigation({ month, year, onPrevMonth, onNextMonth, onAddTask, onLogPeriod }) {
    return (
        <div className="flex justify-between items-center px-6 py-5 border-b border-gray-200">
            <div className="flex items-center gap-4">
                <button
                    onClick={onPrevMonth}
                    className="text-gray-600 hover:bg-gray-100 px-2 py-1 rounded text-xl"
                >
                    ‹
                </button>
                <h2 className="text-xl text-gray-800 min-w-[180px] text-center font-medium">
                    {month} {year}
                </h2>
                <button
                    onClick={onNextMonth}
                    className="text-gray-600 hover:bg-gray-100 px-2 py-1 rounded text-xl"
                >
                    ›
                </button>
            </div>
            <div className="flex gap-3">
                <button
                    onClick={onLogPeriod}
                    className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm font-medium transition-colors"
                >
                    📅 Log Period
                </button>
                <button
                    onClick={onAddTask}
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                    + Add Task
                </button>
            </div>
        </div>
    )
}

export default Navigation
