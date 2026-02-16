import { addDays, parseISO, startOfDay } from 'date-fns'
import { getPhaseForDateAdvanced, calculateAverageCycleLength } from './cycleHelpers'
import { getDayName, isPast, toISODate } from './dateHelpers'

// Max tasks per phase per day
const PHASE_CAPACITY = {
    menstrual: 2,
    follicular: 3,
    ovulation: 5,
    luteal: 3
}

/**
 * Check if a date can be scheduled (not in the past; today is valid)
 * @param {Date} date
 * @returns {boolean}
 */
export function canScheduleOnDate(date) {
    return !isPast(date)
}

/**
 * Generate every date between startDate and endDate (inclusive)
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Date[]}
 */
export function generateCandidateDates(startDate, endDate) {
    const dates = []
    let current = startOfDay(startDate)
    const end = startOfDay(endDate)

    while (current <= end) {
        dates.push(new Date(current))
        current = addDays(current, 1)
    }

    return dates
}

/**
 * Maximum tasks allowed for a given phase
 * @param {string} phase
 * @returns {number}
 */
export function getCapacityForDate(date, phase) {
    return PHASE_CAPACITY[phase] || 3
}

/**
 * Check whether a task's energy level is a good match for a cycle phase
 * Returns true when no energy preference is set (always compatible)
 * @param {string|null} taskEnergy - 'low' | 'medium' | 'high' | null
 * @param {string} phase - 'menstrual' | 'follicular' | 'ovulation' | 'luteal'
 * @returns {boolean}
 */
export function isEnergyMatch(taskEnergy, phase) {
    if (!taskEnergy) return true

    const matches = {
        high: ['ovulation'],
        medium: ['follicular', 'luteal'],
        low: ['luteal', 'menstrual']
    }

    return matches[taskEnergy]?.includes(phase) ?? true
}

/**
 * Check if a date has an open slot (not past, not over capacity)
 * @param {Date} date
 * @param {Object[]} existingTasks - All tasks already in state
 * @param {string} phase
 * @returns {boolean}
 */
export function isDateAvailable(date, existingTasks, phase) {
    if (!canScheduleOnDate(date)) return false

    const dateStr = toISODate(date)
    const capacity = getCapacityForDate(date, phase)
    const tasksOnDate = existingTasks.filter(
        t => t.scheduledDate === dateStr && !t.completed
    ).length

    return tasksOnDate < capacity
}

/**
 * Schedule a task — Phase 1 & 2 implementation.
 *
 * Applies hard filters in order:
 *   1. Not in the past
 *   2. Preferred days (if specified)
 *   3. Strictly before deadline (if specified)
 *   4. Energy-phase match (if energy specified)
 *   5. Capacity check
 *
 * Falls back via findBestFallbackDate when no perfect match exists.
 *
 * @param {Object} task
 * @param {Object[]} existingTasks
 * @param {Object[]} cycles
 * @returns {string} ISO date string (YYYY-MM-DD)
 */
export function scheduleTask(task, existingTasks, cycles) {
    const today = startOfDay(new Date())
    const avgCycleLength = calculateAverageCycleLength(cycles)

    const maxDate = task.deadline
        ? startOfDay(parseISO(task.deadline))
        : addDays(today, 60)

    // Full candidate list (today through maxDate)
    let filtered = generateCandidateDates(today, maxDate)

    // 1. Remove past dates
    filtered = filtered.filter(canScheduleOnDate)

    // 2. Preferred days (Phase 1)
    if (task.preferredDays && task.preferredDays.length > 0) {
        filtered = filtered.filter(d => task.preferredDays.includes(getDayName(d)))
    }

    // 3. Strictly before deadline — not on the deadline day itself (Phase 1)
    if (task.deadline) {
        const deadlineDate = startOfDay(parseISO(task.deadline))
        filtered = filtered.filter(d => startOfDay(d) < deadlineDate)
    }

    // 4. Energy-phase match (Phase 2)
    if (task.energyLevel) {
        filtered = filtered.filter(d => {
            const phase = getPhaseForDateAdvanced(d, cycles, avgCycleLength) || 'luteal'
            return isEnergyMatch(task.energyLevel, phase)
        })
    }

    // 5. Capacity check
    filtered = filtered.filter(d => {
        const phase = getPhaseForDateAdvanced(d, cycles, avgCycleLength) || 'luteal'
        return isDateAvailable(d, existingTasks, phase)
    })

    if (filtered.length > 0) {
        return toISODate(filtered[0])
    }

    // No perfect match — relax constraints one by one
    return findBestFallbackDate(task, existingTasks, cycles, today, maxDate, avgCycleLength)
}

/**
 * Fallback scheduler — relaxes constraints in priority order:
 *   1. Drop energy, keep preferred days + deadline
 *   2. Drop preferred days, keep energy + deadline
 *   3. Any available date before deadline
 *   4. Tomorrow (last resort, ignores capacity)
 *
 * Deadline is always treated as a hard constraint.
 *
 * @param {Object} task
 * @param {Object[]} existingTasks
 * @param {Object[]} cycles
 * @param {Date} startDate
 * @param {Date} endDate
 * @param {number} avgCycleLength
 * @returns {string} ISO date string
 */
function findBestFallbackDate(task, existingTasks, cycles, startDate, endDate, avgCycleLength) {
    const allCandidates = generateCandidateDates(startDate, endDate).filter(canScheduleOnDate)

    // Keep deadline as a hard constraint
    const beforeDeadline = task.deadline
        ? allCandidates.filter(d => startOfDay(d) < startOfDay(parseISO(task.deadline)))
        : allCandidates

    // Try 1: relax energy, keep preferred days
    if (task.preferredDays && task.preferredDays.length > 0) {
        const withPreferred = beforeDeadline.filter(d =>
            task.preferredDays.includes(getDayName(d))
        )
        const found = withPreferred.find(d => {
            const phase = getPhaseForDateAdvanced(d, cycles, avgCycleLength) || 'luteal'
            return isDateAvailable(d, existingTasks, phase)
        })
        if (found) return toISODate(found)
    }

    // Try 2: relax preferred days, keep energy
    if (task.energyLevel) {
        const withEnergy = beforeDeadline.filter(d => {
            const phase = getPhaseForDateAdvanced(d, cycles, avgCycleLength) || 'luteal'
            return isEnergyMatch(task.energyLevel, phase)
        })
        const found = withEnergy.find(d => {
            const phase = getPhaseForDateAdvanced(d, cycles, avgCycleLength) || 'luteal'
            return isDateAvailable(d, existingTasks, phase)
        })
        if (found) return toISODate(found)
    }

    // Try 3: any available date before deadline (all constraints relaxed)
    const found = beforeDeadline.find(d => {
        const phase = getPhaseForDateAdvanced(d, cycles, avgCycleLength) || 'luteal'
        return isDateAvailable(d, existingTasks, phase)
    })
    if (found) return toISODate(found)

    // Last resort: tomorrow regardless of capacity
    return toISODate(addDays(startOfDay(new Date()), 1))
}
