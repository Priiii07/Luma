import { addDays, parseISO, startOfDay } from 'date-fns'
import { getPhaseForDateAdvanced } from './cycleHelpers'
import { isPast, toISODate } from './dateHelpers'
import { scoreDate } from './taskScoringEngine'
import { getCapacityForPhase } from './capacityHelpers'

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
 * Maximum tasks allowed for a given phase, respecting user preferences.
 * @param {string} phase
 * @param {Object} [userPreferences={}]
 * @returns {number}
 */
export function getCapacityForDate(phase, userPreferences = {}) {
    return getCapacityForPhase(phase, userPreferences)
}

/**
 * Check if a date has an open slot (not past, not over capacity)
 * @param {Date} date
 * @param {Object[]} existingTasks - All tasks already in state
 * @param {string} phase
 * @param {Object} [userPreferences={}]
 * @returns {boolean}
 */
export function isDateAvailable(date, existingTasks, phase, userPreferences = {}) {
    if (!canScheduleOnDate(date)) return false

    const dateStr = toISODate(date)
    const capacity = getCapacityForDate(phase, userPreferences)
    const tasksOnDate = existingTasks.filter(
        t => t.scheduledDate === dateStr && !t.completed
    ).length

    return tasksOnDate < capacity
}

/**
 * Schedule a task using intelligent scoring (Phase 3).
 *
 * Hard constraints (non-negotiable):
 *   1. Not in the past
 *   2. Has capacity (phase task limit not exceeded)
 *   3. Strictly before deadline (if set)
 *
 * Soft scoring (weighted 0-100):
 *   - Energy-phase match       40%
 *   - Deadline urgency         30%
 *   - Workload balance         20%
 *   - Day preference           10%
 *
 * Falls back via findBestFallbackDate when no candidates survive hard constraints.
 *
 * @param {Object} task
 * @param {Object[]} existingTasks
 * @param {Object[]} cycles
 * @param {Object} [userPreferences={}]
 * @returns {string} ISO date string (YYYY-MM-DD)
 */
export function scheduleTask(task, existingTasks, cycles, userPreferences = {}) {
    const today = startOfDay(new Date())

    const maxDate = task.deadline
        ? startOfDay(parseISO(task.deadline))
        : addDays(today, 60)

    // Full candidate list (today through maxDate)
    let candidates = generateCandidateDates(today, maxDate)

    // Hard constraint 1: Not in the past
    candidates = candidates.filter(canScheduleOnDate)

    // Hard constraint 2: Strictly before deadline (not on deadline day)
    if (task.deadline) {
        const deadlineDate = startOfDay(parseISO(task.deadline))
        candidates = candidates.filter(d => startOfDay(d) < deadlineDate)
    }

    // Hard constraint 3: Has capacity
    candidates = candidates.filter(d => {
        const phase = getPhaseForDateAdvanced(d, cycles) || 'luteal'
        return isDateAvailable(d, existingTasks, phase, userPreferences)
    })

    if (candidates.length > 0) {
        // Score all candidates and pick the best
        const scored = candidates.map(d =>
            scoreDate(d, task, existingTasks, cycles, userPreferences)
        )
        scored.sort((a, b) => b.totalScore - a.totalScore)
        return toISODate(scored[0].date)
    }

    // No candidates survived hard constraints — relax capacity as last resort
    return findBestFallbackDate(task, existingTasks, cycles, today, maxDate, userPreferences)
}

/**
 * Fallback scheduler — relaxes capacity constraint and scores remaining options.
 * Deadline is always treated as a hard constraint.
 *
 * @param {Object} task
 * @param {Object[]} existingTasks
 * @param {Object[]} cycles
 * @param {Date} startDate
 * @param {Date} endDate
 * @param {Object} userPreferences
 * @returns {string} ISO date string
 */
function findBestFallbackDate(task, existingTasks, cycles, startDate, endDate, userPreferences) {
    // All future dates up to the deadline (capacity ignored)
    let candidates = generateCandidateDates(startDate, endDate).filter(canScheduleOnDate)

    // Deadline remains a hard constraint even in fallback
    if (task.deadline) {
        const deadlineDate = startOfDay(parseISO(task.deadline))
        candidates = candidates.filter(d => startOfDay(d) < deadlineDate)
    }

    if (candidates.length > 0) {
        const scored = candidates.map(d =>
            scoreDate(d, task, existingTasks, cycles, userPreferences)
        )
        scored.sort((a, b) => b.totalScore - a.totalScore)
        return toISODate(scored[0].date)
    }

    // Absolute last resort: tomorrow regardless of everything
    return toISODate(addDays(startOfDay(new Date()), 1))
}

/**
 * Like scheduleTask, but returns rich scheduling info for the overload warning.
 *
 * @param {Object} task
 * @param {Object[]} existingTasks
 * @param {Object[]} cycles
 * @param {Object} [userPreferences={}]
 * @returns {{
 *   scheduledDate: string,
 *   isAtCapacity: boolean,
 *   tasksOnDate: number,
 *   capacity: number,
 *   phase: string,
 *   alternatives: Array<{ date: string, phase: string, tasksOnDate: number, capacity: number, score: number }>
 * }}
 */
export function scheduleTaskWithAlternatives(task, existingTasks, cycles, userPreferences = {}) {
    const today = startOfDay(new Date())
    const maxDate = task.deadline
        ? startOfDay(parseISO(task.deadline))
        : addDays(today, 60)

    let candidates = generateCandidateDates(today, maxDate).filter(canScheduleOnDate)

    if (task.deadline) {
        const deadlineDate = startOfDay(parseISO(task.deadline))
        candidates = candidates.filter(d => startOfDay(d) < deadlineDate)
    }

    // Score ALL candidates (including over-capacity ones) so we can show alternatives
    const allScored = candidates.map(d => {
        const phase = getPhaseForDateAdvanced(d, cycles) || 'luteal'
        const capacity = getCapacityForPhase(phase, userPreferences)
        const tasksOnDate = existingTasks.filter(
            t => t.scheduledDate === toISODate(d) && !t.completed
        ).length
        const scored = scoreDate(d, task, existingTasks, cycles, userPreferences)
        return { ...scored, phase, tasksOnDate, capacity, dateStr: toISODate(d) }
    })

    // Prefer within-capacity candidates for the best pick
    const withinCapacity = allScored.filter(s => s.tasksOnDate < s.capacity)
    const pool = withinCapacity.length > 0 ? withinCapacity : allScored
    pool.sort((a, b) => b.totalScore - a.totalScore)

    const best = pool[0]
    if (!best) {
        const fallback = toISODate(addDays(today, 1))
        return { scheduledDate: fallback, isAtCapacity: false, tasksOnDate: 0, capacity: 3, phase: 'luteal', alternatives: [] }
    }

    const isAtCapacity = best.tasksOnDate >= best.capacity

    // Up to 3 alternatives: different dates, within capacity, sorted by score
    const alternatives = withinCapacity
        .filter(s => s.dateStr !== best.dateStr)
        .slice(0, 3)
        .map(s => ({ date: s.dateStr, phase: s.phase, tasksOnDate: s.tasksOnDate, capacity: s.capacity, score: Math.round(s.totalScore) }))

    return {
        scheduledDate: best.dateStr,
        isAtCapacity,
        tasksOnDate: best.tasksOnDate,
        capacity: best.capacity,
        phase: best.phase,
        alternatives
    }
}
