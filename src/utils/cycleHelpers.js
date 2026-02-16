import { addDays, parseISO, differenceInDays, format } from 'date-fns'
import { v4 as uuidv4 } from 'uuid'

/**
 * Calculate phase boundaries from a cycle start date
 * YOUR LOGIC:
 * - Menstrual: Day 1 to Day X (X = logged duration, e.g., 4-7 days)
 * - Follicular: Day (X+1) to Day 13 (ALWAYS ends on day 13)
 * - Ovulation: Day 14-15 (ALWAYS 2 days, FIXED)
 * - Luteal: Day 16 to next period (flexible based on cycle length)
 * 
 * @param {string|Date} startDate - Cycle start date
 * @param {number} menstrualDuration - Menstrual phase duration (from logged data)
 * @param {number} cycleLength - Total cycle length (default 28)
 * @returns {Object} Phase boundaries
 */
export function calculatePhasesFromStart(startDate, menstrualDuration = 5, cycleLength = 28) {
    const start = typeof startDate === 'string' ? parseISO(startDate) : startDate

    // YOUR SPECIFICATION:
    // Menstrual: Day 1 to Day menstrualDuration
    const menstrualStart = start
    const menstrualEnd = addDays(start, menstrualDuration - 1)

    // Follicular: Day (menstrualDuration + 1) to Day 13
    const follicularStart = addDays(start, menstrualDuration)
    const follicularEnd = addDays(start, 12) // Day 13 (0-indexed, so 12)

    // Ovulation: Day 14-15 (ALWAYS FIXED)
    const ovulationStart = addDays(start, 13) // Day 14
    const ovulationEnd = addDays(start, 14)   // Day 15

    // Luteal: Day 16 to (cycle end - 1)
    const lutealStart = addDays(start, 15) // Day 16
    const lutealEnd = addDays(start, cycleLength - 1) // Last day before next period

    return {
        menstrual: {
            start: format(menstrualStart, 'yyyy-MM-dd'),
            end: format(menstrualEnd, 'yyyy-MM-dd')
        },
        follicular: {
            start: format(follicularStart, 'yyyy-MM-dd'),
            end: format(follicularEnd, 'yyyy-MM-dd')
        },
        ovulation: {
            start: format(ovulationStart, 'yyyy-MM-dd'),
            end: format(ovulationEnd, 'yyyy-MM-dd')
        },
        luteal: {
            start: format(lutealStart, 'yyyy-MM-dd'),
            end: format(lutealEnd, 'yyyy-MM-dd')
        }
    }
}

/**
 * Create a complete cycle entry with calculated fields
 * @param {string} startDate - Cycle start date (YYYY-MM-DD)
 * @param {string} [endDate] - Period end date (YYYY-MM-DD, optional)
 * @param {Array} [existingCycles] - Previous cycles for calculating cycle length
 * @returns {Object} Complete cycle entry
 */
export function createCycleEntry(startDate, endDate = null, existingCycles = []) {
    // Calculate actual menstrual duration from start and end dates
    let menstrualDuration = 5 // default

    if (endDate) {
        const start = parseISO(startDate)
        const end = parseISO(endDate)
        menstrualDuration = differenceInDays(end, start) + 1 // +1 to include both start and end day
    }

    // Determine cycle length based on existing cycles
    let cycleLength = 28 // default

    if (existingCycles && existingCycles.length > 0) {
        // Sort to get the most recent cycle
        const sorted = [...existingCycles].sort((a, b) =>
            new Date(b.startDate) - new Date(a.startDate)
        )
        const lastCycle = sorted[0]

        // Calculate the actual cycle length from last period to this one
        const lastStart = parseISO(lastCycle.startDate)
        const thisStart = parseISO(startDate)
        cycleLength = differenceInDays(thisStart, lastStart)

        // If we have 2+ cycles, we can calculate average cycle length
        if (existingCycles.length >= 2) {
            cycleLength = calculateAverageCycleLength([...existingCycles, { startDate }])
        }
    }

    return {
        id: `cycle-${startDate}-${uuidv4()}`,
        startDate,
        endDate,
        menstrualDuration,  // Store the actual duration entered by user
        cycleDay: 1,
        cycleLength: null, // Will be filled when next period is logged
        loggedAt: new Date().toISOString(),
        isManual: true,
        phases: calculatePhasesFromStart(startDate, menstrualDuration, cycleLength)
    }
}

/**
 * Calculate which phase a given date falls into based on a cycle
 * @param {string|Date} targetDate - Date to check
 * @param {Object} cycle - Cycle entry with phases
 * @returns {string|null} Phase name or null if outside cycle
 */
export function getPhaseForDate(targetDate, cycle) {
    const dateStr = typeof targetDate === 'string' ? targetDate : format(targetDate, 'yyyy-MM-dd')

    if (!cycle || !cycle.phases) return null

    const { phases } = cycle

    // Check each phase
    if (dateStr >= phases.menstrual.start && dateStr <= phases.menstrual.end) {
        return 'menstrual'
    }
    if (dateStr >= phases.follicular.start && dateStr <= phases.follicular.end) {
        return 'follicular'
    }
    if (dateStr >= phases.ovulation.start && dateStr <= phases.ovulation.end) {
        return 'ovulation'
    }
    if (dateStr >= phases.luteal.start && dateStr <= phases.luteal.end) {
        return 'luteal'
    }

    return null
}

/**
 * Calculate the cycle day for a given date
 * @param {string|Date} targetDate - Date to check
 * @param {string|Date} cycleStartDate - Start date of the cycle
 * @returns {number} Cycle day (1-based)
 */
export function getCycleDayForDate(targetDate, cycleStartDate) {
    const target = typeof targetDate === 'string' ? parseISO(targetDate) : targetDate
    const start = typeof cycleStartDate === 'string' ? parseISO(cycleStartDate) : cycleStartDate

    const daysDiff = differenceInDays(target, start)
    return daysDiff + 1 // 1-based indexing
}

/**
 * Calculate average cycle length from historical cycles
 * @param {Array} cycles - Array of cycle entries
 * @returns {number} Average cycle length
 */
export function calculateAverageCycleLength(cycles) {
    if (!cycles || cycles.length < 2) return 28 // Default

    // Sort by start date
    const sorted = [...cycles].sort((a, b) =>
        new Date(a.startDate) - new Date(b.startDate)
    )

    let totalDays = 0
    let count = 0

    for (let i = 1; i < sorted.length; i++) {
        const prevStart = parseISO(sorted[i - 1].startDate)
        const currStart = parseISO(sorted[i].startDate)
        const diff = differenceInDays(currStart, prevStart)

        // Only count reasonable cycle lengths (21-45 days)
        if (diff >= 21 && diff <= 45) {
            totalDays += diff
            count++
        }
    }

    return count > 0 ? Math.round(totalDays / count) : 28
}

/**
 * Calculate average period duration
 * @param {Array} cycles - Array of cycle entries with endDate
 * @returns {number} Average period duration in days
 */
export function calculateAveragePeriodDuration(cycles) {
    if (!cycles || cycles.length === 0) return 5 // Default

    const cyclesWithEnd = cycles.filter(c => c.endDate)
    if (cyclesWithEnd.length === 0) return 5

    let totalDays = 0

    for (const cycle of cyclesWithEnd) {
        const start = parseISO(cycle.startDate)
        const end = parseISO(cycle.endDate)
        const duration = differenceInDays(end, start) + 1 // Include both days
        totalDays += duration
    }

    return Math.round(totalDays / cyclesWithEnd.length)
}

/**
 * Calculate average menstrual duration from logged cycles
 * Uses the stored menstrualDuration field
 * @param {Array} cycles - Array of cycle entries
 * @returns {number} Average menstrual duration in days
 */
export function calculateAverageMenstrualDuration(cycles) {
    if (!cycles || cycles.length === 0) return 5 // Default

    // Get cycles that have menstrualDuration stored
    const durationsWithData = cycles
        .map(c => c.menstrualDuration)
        .filter(d => d != null && d > 0)

    if (durationsWithData.length === 0) return 5

    const avg = durationsWithData.reduce((sum, d) => sum + d, 0) / durationsWithData.length
    return Math.round(avg) // Round to nearest day
}

/**
 * Predict the next period start date
 * @param {string|Date} lastPeriodStart - Last period start date
 * @param {number} averageCycleLength - Average cycle length
 * @returns {string} Predicted next period date (YYYY-MM-DD)
 */
export function predictNextPeriod(lastPeriodStart, averageCycleLength = 28) {
    const lastStart = typeof lastPeriodStart === 'string' ? parseISO(lastPeriodStart) : lastPeriodStart
    const nextStart = addDays(lastStart, averageCycleLength)
    return format(nextStart, 'yyyy-MM-dd')
}

/**
 * Get cycle statistics from historical data
 * @param {Array} cycles - Array of cycle entries
 * @returns {Object} Cycle statistics
 */
export function getCycleStatistics(cycles) {
    if (!cycles || cycles.length === 0) {
        return {
            averageCycleLength: 28,
            averagePeriodDuration: 5,
            totalCyclesLogged: 0,
            lastPeriodDate: null,
            predictedNextPeriod: null
        }
    }

    const avgCycleLength = calculateAverageCycleLength(cycles)
    const avgPeriodDuration = calculateAverageMenstrualDuration(cycles)

    // Get most recent cycle
    const sorted = [...cycles].sort((a, b) =>
        new Date(b.startDate) - new Date(a.startDate)
    )
    const latestCycle = sorted[0]

    return {
        averageCycleLength: avgCycleLength,
        averagePeriodDuration: avgPeriodDuration,
        totalCyclesLogged: cycles.length,
        lastPeriodDate: latestCycle.startDate,
        predictedNextPeriod: predictNextPeriod(latestCycle.startDate, avgCycleLength)
    }
}

/**
 * Update cycle lengths retroactively when new cycle is logged
 * @param {Array} cycles - Array of all cycles
 * @returns {Array} Cycles with updated cycleLength fields
 */
export function updateCycleLengths(cycles) {
    if (!cycles || cycles.length < 2) return cycles

    // Sort by start date
    const sorted = [...cycles].sort((a, b) =>
        new Date(a.startDate) - new Date(b.startDate)
    )

    // Update each cycle's length based on the next cycle
    for (let i = 0; i < sorted.length - 1; i++) {
        const currStart = parseISO(sorted[i].startDate)
        const nextStart = parseISO(sorted[i + 1].startDate)
        sorted[i].cycleLength = differenceInDays(nextStart, currStart)
    }

    // Last cycle doesn't have a cycleLength yet
    sorted[sorted.length - 1].cycleLength = null

    return sorted
}

/**
 * Get the active cycle for a given date
 * @param {string|Date} targetDate - Date to check
 * @param {Array} cycles - Array of cycle entries
 * @returns {Object|null} Active cycle or null
 */
export function getActiveCycleForDate(targetDate, cycles) {
    if (!cycles || cycles.length === 0) return null

    const dateStr = typeof targetDate === 'string' ? targetDate : format(targetDate, 'yyyy-MM-dd')

    // Sort cycles by start date (descending)
    const sorted = [...cycles].sort((a, b) =>
        new Date(b.startDate) - new Date(a.startDate)
    )

    // Find the most recent cycle that started on or before the target date
    for (const cycle of sorted) {
        if (cycle.startDate <= dateStr) {
            // Check if date is within this cycle's phase boundaries
            const phase = getPhaseForDate(dateStr, cycle)
            if (phase) {
                return cycle
            }
        }
    }

    return null
}

/**
 * Get current phase and cycle day for today
 * @param {Array} cycles - Array of cycle entries
 * @returns {Object} Current phase info
 */
export function getCurrentPhaseInfo(cycles) {
    const today = format(new Date(), 'yyyy-MM-dd')
    const activeCycle = getActiveCycleForDate(today, cycles)

    if (!activeCycle) {
        return {
            phase: null,
            cycleDay: null,
            cycle: null
        }
    }

    return {
        phase: getPhaseForDate(today, activeCycle),
        cycleDay: getCycleDayForDate(today, activeCycle.startDate),
        cycle: activeCycle
    }
}

/**
 * Get phase for any date using predictive logic
 * Uses average menstrual duration and average cycle length for predictions
 * @param {string|Date} targetDate - Date to check
 * @param {Array} cycles - Array of cycle entries
 * @returns {string|null} Phase name
 */
export function getPhaseForDateAdvanced(targetDate, cycles) {
    const dateStr = typeof targetDate === 'string' ? targetDate : format(targetDate, 'yyyy-MM-dd')

    // If no cycles, return default
    if (!cycles || cycles.length === 0) {
        return null
    }

    // Sort cycles by start date (NEWEST FIRST so user entries override older predictions)
    const sorted = [...cycles].sort((a, b) =>
        new Date(b.startDate) - new Date(a.startDate)  // ✅ Descending order
    )

    const targetDateObj = parseISO(dateStr)

    // Check if date falls within any logged cycle's phases
    for (const cycle of sorted) {
        const phase = getPhaseForDate(dateStr, cycle)
        if (phase) {
            return phase
        }
    }

    // PREDICTIVE LOGIC for future dates
    // sorted is newest-first (descending), so sorted[0] is the most recent cycle
    const latestCycle = sorted[0]
    const latestStart = parseISO(latestCycle.startDate)
    const daysDiff = differenceInDays(targetDateObj, latestStart)

    if (daysDiff > 0) {
        // Future prediction
        const avgCycleLength = calculateAverageCycleLength(cycles)
        const avgMenstrualDuration = calculateAverageMenstrualDuration(cycles)

        // Calculate how many complete cycles ahead
        const cycleNumber = Math.floor(daysDiff / avgCycleLength)

        // Calculate the predicted cycle start
        const predictedCycleStart = addDays(latestStart, cycleNumber * avgCycleLength)
        const predictedPhases = calculatePhasesFromStart(
            predictedCycleStart,
            avgMenstrualDuration,
            avgCycleLength
        )

        // Check which phase the day falls into
        if (dateStr >= predictedPhases.menstrual.start && dateStr <= predictedPhases.menstrual.end) {
            return 'menstrual'
        }
        if (dateStr >= predictedPhases.follicular.start && dateStr <= predictedPhases.follicular.end) {
            return 'follicular'
        }
        if (dateStr >= predictedPhases.ovulation.start && dateStr <= predictedPhases.ovulation.end) {
            return 'ovulation'
        }
        if (dateStr >= predictedPhases.luteal.start && dateStr <= predictedPhases.luteal.end) {
            return 'luteal'
        }
    }

    // If before first logged cycle, project backwards
    // sorted is newest-first (descending), so sorted[sorted.length - 1] is the oldest cycle
    const firstCycle = sorted[sorted.length - 1]
    const firstStart = parseISO(firstCycle.startDate)

    if (targetDateObj < firstStart) {
        const avgCycleLength = calculateAverageCycleLength(cycles)
        const avgMenstrualDuration = calculateAverageMenstrualDuration(cycles)

        const daysBack = differenceInDays(firstStart, targetDateObj)
        const cyclesBack = Math.ceil(daysBack / avgCycleLength)

        const projectedStart = addDays(firstStart, -cyclesBack * avgCycleLength)
        const projectedPhases = calculatePhasesFromStart(
            projectedStart,
            avgMenstrualDuration,
            avgCycleLength
        )

        if (dateStr >= projectedPhases.menstrual.start && dateStr <= projectedPhases.menstrual.end) {
            return 'menstrual'
        }
        if (dateStr >= projectedPhases.follicular.start && dateStr <= projectedPhases.follicular.end) {
            return 'follicular'
        }
        if (dateStr >= projectedPhases.ovulation.start && dateStr <= projectedPhases.ovulation.end) {
            return 'ovulation'
        }
        if (dateStr >= projectedPhases.luteal.start && dateStr <= projectedPhases.luteal.end) {
            return 'luteal'
        }
    }

    // Fallback
    return null
}

export default {
    calculatePhasesFromStart,
    createCycleEntry,
    getPhaseForDate,
    getCycleDayForDate,
    calculateAverageCycleLength,
    calculateAveragePeriodDuration,
    calculateAverageMenstrualDuration,
    predictNextPeriod,
    getCycleStatistics,
    updateCycleLengths,
    getActiveCycleForDate,
    getCurrentPhaseInfo,
    getPhaseForDateAdvanced
}