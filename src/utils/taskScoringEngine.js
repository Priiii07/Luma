import { differenceInDays, startOfDay, parseISO } from 'date-fns'
import { getPhaseForDateAdvanced } from './cycleHelpers'
import { getDayName, toISODate } from './dateHelpers'
import { getCapacityForPhase } from './capacityHelpers'

/**
 * Energy match score (0-100)
 * Perfect match = 100, acceptable backup = 60, poor match = 20, no preference = 50
 *
 * @param {Object} task
 * @param {string} phase - 'menstrual' | 'follicular' | 'ovulation' | 'luteal'
 * @returns {number}
 */
export function calculateEnergyMatchScore(task, phase) {
    if (!task.energyLevel) return 50 // Neutral — no preference set

    const perfectMatches = {
        high: ['ovulation'],
        medium: ['follicular', 'luteal'],
        low: ['luteal', 'menstrual']
    }

    const goodMatches = {
        high: ['follicular'],  // Acceptable backup for high-energy
        medium: ['ovulation'], // Can handle medium tasks
        low: ['follicular']    // Okay backup for low-energy
    }

    if (perfectMatches[task.energyLevel]?.includes(phase)) return 100
    if (goodMatches[task.energyLevel]?.includes(phase)) return 60
    return 20 // Poor match (e.g. high-energy task in menstrual/luteal)
}

/**
 * Deadline urgency score (0-100)
 * Higher = more urgent = schedule sooner
 *
 * @param {Object} task
 * @param {Date} date - Candidate date
 * @returns {number}
 */
export function calculateDeadlineUrgencyScore(task, date) {
    if (!task.deadline) return 50 // Neutral — no deadline

    const daysUntilDeadline = differenceInDays(
        startOfDay(parseISO(task.deadline)),
        startOfDay(date)
    )

    if (daysUntilDeadline < 0) return 0  // Past deadline — impossible
    if (daysUntilDeadline === 0) return 30 // On deadline day — avoid if possible
    if (daysUntilDeadline === 1) return 95
    if (daysUntilDeadline === 2) return 90
    if (daysUntilDeadline <= 7) return 80
    if (daysUntilDeadline <= 14) return 60
    if (daysUntilDeadline <= 30) return 40
    return 20 // Far out — low urgency
}

/**
 * Workload balance score (0-100)
 * Prefers dates with lower utilization (more even spread)
 *
 * @param {Date} date - Candidate date
 * @param {Object[]} existingTasks - All tasks in state
 * @param {string} phase - Phase for this date
 * @returns {number}
 */
export function calculateWorkloadBalanceScore(date, existingTasks, phase, userPreferences = {}) {
    const capacity = getCapacityForPhase(phase, userPreferences)
    const dateStr = toISODate(date)
    const tasksOnDate = existingTasks.filter(
        t => t.scheduledDate === dateStr && !t.completed
    ).length

    const utilization = tasksOnDate / capacity

    if (utilization === 0) return 100     // Empty — excellent
    if (utilization < 0.3) return 90      // Very light
    if (utilization < 0.5) return 80      // Light
    if (utilization < 0.7) return 60      // Moderate
    if (utilization < 0.85) return 40     // Getting full
    if (utilization < 1.0) return 20      // Almost full
    return 0                              // Full / over capacity
}

/**
 * Day preference score (0-100)
 * Returns 100 if date matches preferred days, 0 if it doesn't.
 * When no preference is set: slight default preference for weekdays.
 *
 * @param {Object} task
 * @param {Date} date - Candidate date
 * @returns {number}
 */
export function calculateDayPreferenceScore(task, date) {
    const dayName = getDayName(date)
    const isWeekend = [0, 6].includes(date.getDay()) // 0=Sun, 6=Sat

    if (task.preferredDays && task.preferredDays.length > 0) {
        return task.preferredDays.includes(dayName) ? 100 : 0
    }

    // Default: slight preference for weekdays (professionals work Mon-Fri)
    return isWeekend ? 60 : 80
}

/**
 * Score a candidate date for a given task.
 * Returns an object with totalScore (0-100) and a breakdown per component.
 *
 * Weights (overridable via userPreferences.schedulingWeights):
 *   energyMatch    40%
 *   deadlineUrgency 30%
 *   workloadBalance 20%
 *   dayPreference  10%
 *
 * @param {Date} date - Candidate date
 * @param {Object} task
 * @param {Object[]} existingTasks
 * @param {Object[]} cycles
 * @param {Object} [userPreferences={}]
 * @returns {{ date: Date, totalScore: number, breakdown: Object }}
 */
export function scoreDate(date, task, existingTasks, cycles, userPreferences = {}) {
    const weights = userPreferences.schedulingWeights || {
        energyMatch: 0.40,
        deadlineUrgency: 0.30,
        workloadBalance: 0.20,
        dayPreference: 0.10
    }

    const phase = getPhaseForDateAdvanced(date, cycles) || 'luteal'

    const breakdown = {
        energyMatch: calculateEnergyMatchScore(task, phase),
        deadlineUrgency: calculateDeadlineUrgencyScore(task, date),
        workloadBalance: calculateWorkloadBalanceScore(date, existingTasks, phase, userPreferences),
        dayPreference: calculateDayPreferenceScore(task, date)
    }

    const totalScore =
        breakdown.energyMatch * weights.energyMatch +
        breakdown.deadlineUrgency * weights.deadlineUrgency +
        breakdown.workloadBalance * weights.workloadBalance +
        breakdown.dayPreference * weights.dayPreference

    return { date, totalScore, breakdown, phase }
}
