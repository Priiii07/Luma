function Navigation({ month, year, onPrevMonth, onNextMonth, onAddTask, onLogPeriod, isOnboarded = true, cyclesLogged = 0 }) {
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
            <div className="flex gap-3 items-center">
                <button
                    onClick={onLogPeriod}
                    className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm font-medium transition-colors"
                >
                    📅 Log Period
                </button>

                {isOnboarded ? (
                    <button
                        onClick={onAddTask}
                        className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        + Add Task
                    </button>
                ) : (
                    <div className="relative group">
                        <button
                            disabled
                            className="px-5 py-2.5 bg-gray-200 text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed"
                        >
                            + Add Task
                        </button>
                        <div className="absolute right-0 top-full mt-2 w-52 bg-gray-900 text-white text-xs rounded-lg px-3 py-2
                                        opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center">
                            Log {2 - cyclesLogged} more period{2 - cyclesLogged !== 1 ? 's' : ''} to unlock task scheduling
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Navigation
