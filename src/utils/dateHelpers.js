import {
    differenceInDays,
    addDays,
    startOfDay,
    parseISO,
    format,
    isSameDay,
    isWithinInterval,
    getDay
} from 'date-fns'

/**
 * Calculate which cycle phase a given date falls into
 * @param {Date|string} date - Date to check
 * @param {Date|string} periodStartDate - Start date of the menstrual period
 * @param {number} [cycleLength=28] - Average cycle length in days
 * @returns {Object} Phase info { phase: string, day: number }
 */
export function getPhaseForDate(date, periodStartDate, cycleLength = 28) {
    const targetDate = typeof date === 'string' ? parseISO(date) : date
    const startDate = typeof periodStartDate === 'string' ? parseISO(periodStartDate) : periodStartDate

    const dayInCycle = differenceInDays(startOfDay(targetDate), startOfDay(startDate)) % cycleLength
    const adjustedDay = dayInCycle < 0 ? dayInCycle + cycleLength : dayInCycle

    // Phase calculations (approximate):
    // Days 0-4: Menstrual
    // Days 5-12: Follicular
    // Days 13-16: Ovulation
    // Days 17-27: Luteal

    let phase
    if (adjustedDay >= 0 && adjustedDay <= 4) {
        phase = 'menstrual'
    } else if (adjustedDay >= 5 && adjustedDay <= 12) {
        phase = 'follicular'
    } else if (adjustedDay >= 13 && adjustedDay <= 16) {
        phase = 'ovulation'
    } else {
        phase = 'luteal'
    }

    return {
        phase,
        dayInCycle: adjustedDay + 1 // Convert to 1-indexed
    }
}

/**
 * Get expected energy level for a cycle phase
 * @param {string} phase - Phase name
 * @returns {string} Energy level: 'low', 'medium', 'high'
 */
export function getPhaseEnergyLevel(phase) {
    const energyMap = {
        menstrual: 'low',
        follicular: 'medium',
        ovulation: 'high',
        luteal: 'medium'
    }
    return energyMap[phase] || 'medium'
}

/**
 * Check if a task's energy level is compatible with a phase
 * @param {string} taskEnergy - Task energy level
 * @param {string} phaseEnergy - Phase energy level
 * @returns {boolean} True if compatible
 */
export function isEnergyCompatible(taskEnergy, phaseEnergy) {
    if (!taskEnergy) return true // No preference, always compatible

    const energyRanking = { low: 1, medium: 2, high: 3 }
    const taskRank = energyRanking[taskEnergy] || 2
    const phaseRank = energyRanking[phaseEnergy] || 2

    // Task energy should be <= phase energy for good compatibility
    return taskRank <= phaseRank
}

/**
 * Get phase color for UI
 * @param {string} phase - Phase name
 * @returns {string} Color class or hex code
 */
export function getPhaseColor(phase) {
    const colorMap = {
        menstrual: '#ffccd5',
        follicular: '#ffe5b4',
        ovulation: '#e0b0ff',
        luteal: '#e5e5e5'
    }
    return colorMap[phase] || '#ffffff'
}

/**
 * Calculate predicted next period date
 * @param {Date|string} lastPeriodDate - Last period start date
 * @param {number} [cycleLength=28] - Average cycle length
 * @returns {Date} Predicted next period date
 */
export function predictNextPeriod(lastPeriodDate, cycleLength = 28) {
    const lastDate = typeof lastPeriodDate === 'string' ? parseISO(lastPeriodDate) : lastPeriodDate
    return addDays(lastDate, cycleLength)
}

/**
 * Calculate average cycle length from historical data
 * @param {Array} cycles - Array of cycle objects with startDate
 * @returns {number} Average cycle length in days
 */
export function calculateAverageCycleLength(cycles) {
    if (!cycles || cycles.length < 2) return 28 // Default

    const sortedCycles = [...cycles].sort((a, b) =>
        new Date(a.startDate) - new Date(b.startDate)
    )

    let totalDays = 0
    let count = 0

    for (let i = 1; i < sortedCycles.length; i++) {
        const prevDate = parseISO(sortedCycles[i - 1].startDate)
        const currDate = parseISO(sortedCycles[i].startDate)
        const diff = differenceInDays(currDate, prevDate)

        // Only count reasonable cycle lengths (21-35 days)
        if (diff >= 21 && diff <= 35) {
            totalDays += diff
            count++
        }
    }

    return count > 0 ? Math.round(totalDays / count) : 28
}

/**
 * Get day of week name from date
 * @param {Date|string} date - Date
 * @returns {string} Day name (e.g., 'Mon', 'Tue')
 */
export function getDayName(date) {
    const d = typeof date === 'string' ? parseISO(date) : date
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return days[getDay(d)]
}

/**
 * Check if a date matches preferred days
 * @param {Date|string} date - Date to check
 * @param {Array<string>} preferredDays - Array of day names
 * @returns {boolean} True if date is in preferred days
 */
export function isPreferredDay(date, preferredDays) {
    if (!preferredDays || preferredDays.length === 0) return true
    const dayName = getDayName(date)
    return preferredDays.includes(dayName)
}

/**
 * Format date for display
 * @param {Date|string} date - Date
 * @param {string} [formatStr='MMM d, yyyy'] - Format string
 * @returns {string} Formatted date
 */
export function formatDate(date, formatStr = 'MMM d, yyyy') {
    const d = typeof date === 'string' ? parseISO(date) : date
    return format(d, formatStr)
}

/**
 * Get dates for a month view (including overflow from prev/next months)
 * @param {number} year - Year
 * @param {number} month - Month (0-11)
 * @returns {Array<Date>} Array of dates for calendar grid
 */
export function getMonthDates(year, month) {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    const startDay = getDay(firstDay)
    const endDay = getDay(lastDay)

    const dates = []

    // Days from previous month
    for (let i = startDay - 1; i >= 0; i--) {
        dates.push(addDays(firstDay, -i - 1))
    }

    // Days in current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
        dates.push(new Date(year, month, i))
    }

    // Days from next month
    const remainingCells = 35 - dates.length // 5 weeks
    for (let i = 1; i <= remainingCells; i++) {
        dates.push(addDays(lastDay, i))
    }

    return dates
}

/**
 * Check if a date is today
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is today
 */
export function isToday(date) {
    const d = typeof date === 'string' ? parseISO(date) : date
    return isSameDay(d, new Date())
}

/**
 * Convert Date to ISO date string (YYYY-MM-DD)
 * @param {Date} date - Date object
 * @returns {string} ISO date string
 */
export function toISODate(date) {
    return format(date, 'yyyy-MM-dd')
}

/**
 * Check if a date is in the past
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is in the past
 */
export function isPast(date) {
    const d = typeof date === 'string' ? parseISO(date) : date
    return startOfDay(d) < startOfDay(new Date())
}

export default {
    getPhaseForDate,
    getPhaseEnergyLevel,
    isEnergyCompatible,
    getPhaseColor,
    predictNextPeriod,
    calculateAverageCycleLength,
    getDayName,
    isPreferredDay,
    formatDate,
    getMonthDates,
    isToday,
    toISODate,
    isPast
}
