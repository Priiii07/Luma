import { addDays, parseISO, startOfDay } from 'date-fns'
import {
    getPhaseForDate,
    getPhaseEnergyLevel,
    isEnergyCompatible,
    isPreferredDay,
    isPast,
    toISODate
} from './dateHelpers'
import { getTasksByDate, getIncompleteTasks } from './storageHelpers'

/**
 * Main scheduling engine - assigns tasks to optimal dates
 * @param {Object} task - Task to schedule
 * @param {string} periodStartDate - Most recent period start date
 * @param {number} [cycleLength=28] - Average cycle length
 * @param {number} [lookAheadDays=60] - How many days to look ahead for scheduling
 * @returns {Promise<string>} Optimal ISO date string for scheduling
 */
export async function scheduleTask(task, periodStartDate, cycleLength = 28, lookAheadDays = 60) {
    const today = startOfDay(new Date())
    const startDate = task.deadline ? parseISO(task.deadline) : addDays(today, 1)

    // If there's a deadline, limit search to deadline
    const maxDate = task.deadline
        ? parseISO(task.deadline)
        : addDays(today, lookAheadDays)

    // Score each candidate date
    const candidates = []
    let currentDate = addDays(today, 1) // Start from tomorrow

    while (currentDate <= maxDate) {
        const score = await scoreDateForTask(currentDate, task, periodStartDate, cycleLength)

        candidates.push({
            date: currentDate,
            score,
            isoDate: toISODate(currentDate)
        })

        currentDate = addDays(currentDate, 1)
    }

    // Sort by score (highest first) and return best date
    candidates.sort((a, b) => b.score - a.score)

    return candidates.length > 0 ? candidates[0].isoDate : toISODate(addDays(today, 1))
}

/**
 * Score a date for task scheduling (higher is better)
 * @param {Date} date - Date to score
 * @param {Object} task - Task object
 * @param {string} periodStartDate - Period start date
 * @param {number} cycleLength - Cycle length
 * @returns {Promise<number>} Score (0-100)
 */
async function scoreDateForTask(date, task, periodStartDate, cycleLength) {
    let score = 50 // Base score

    // 1. Energy compatibility (±20 points)
    const { phase } = getPhaseForDate(date, periodStartDate, cycleLength)
    const phaseEnergy = getPhaseEnergyLevel(phase)

    if (task.energyLevel) {
        if (isEnergyCompatible(task.energyLevel, phaseEnergy)) {
            score += 20

            // Bonus for perfect match
            if (task.energyLevel === phaseEnergy) {
                score += 10
            }
        } else {
            score -= 20
        }
    }

    // 2. Preferred days (±15 points)
    if (task.preferredDays && task.preferredDays.length > 0) {
        if (isPreferredDay(date, task.preferredDays)) {
            score += 15
        } else {
            score -= 10
        }
    }

    // 3. Daily load balancing (±20 points)
    const existingTasks = await getTasksByDate(toISODate(date))
    const taskCount = existingTasks.length

    if (taskCount === 0) {
        score += 20 // Prefer empty days
    } else if (taskCount === 1) {
        score += 10
    } else if (taskCount === 2) {
        score -= 5
    } else if (taskCount >= 3) {
        score -= 20 // Avoid overloaded days
    }

    // 4. Phase-specific load limits
    const phaseMaxTasks = {
        menstrual: 2,    // Low energy - max 2 tasks/day
        follicular: 3,   // Medium energy
        ovulation: 5,    // High energy - can handle more
        luteal: 3        // Medium energy
    }

    if (taskCount >= phaseMaxTasks[phase]) {
        score -= 30 // Heavy penalty for exceeding phase capacity
    }

    // 5. Deadline proximity bonus (if deadline exists)
    if (task.deadline) {
        const deadlineDate = parseISO(task.deadline)
        const daysUntilDeadline = Math.floor((deadlineDate - date) / (1000 * 60 * 60 * 24))

        if (daysUntilDeadline < 3) {
            score += 15 // Bonus for scheduling close to deadline
        }
    }

    // 6. Avoid past dates (should never happen, but just in case)
    if (isPast(date)) {
        score = -100
    }

    return Math.max(0, Math.min(100, score)) // Clamp between 0-100
}

/**
 * Reschedule all incomplete tasks (e.g., when new period is logged)
 * @param {string} newPeriodStartDate - New period start date
 * @param {number} cycleLength - Cycle length
 * @returns {Promise<Array>} Array of {taskId, oldDate, newDate}
 */
export async function rescheduleAllTasks(newPeriodStartDate, cycleLength = 28) {
    const incompleteTasks = await getIncompleteTasks()
    const changes = []

    for (const task of incompleteTasks) {
        const oldDate = task.scheduledDate
        const newDate = await scheduleTask(task, newPeriodStartDate, cycleLength)

        if (oldDate !== newDate) {
            changes.push({
                taskId: task.id,
                oldDate,
                newDate
            })
        }
    }

    return changes
}

/**
 * Find overloaded days in a date range
 * @param {Date} startDate - Start of range
 * @param {Date} endDate - End of range
 * @param {string} periodStartDate - Period start date
 * @param {number} cycleLength - Cycle length
 * @returns {Promise<Array>} Array of overloaded dates with info
 */
export async function findOverloadedDays(startDate, endDate, periodStartDate, cycleLength = 28) {
    const overloaded = []
    let currentDate = startDate

    while (currentDate <= endDate) {
        const isoDate = toISODate(currentDate)
        const tasks = await getTasksByDate(isoDate)
        const { phase } = getPhaseForDate(currentDate, periodStartDate, cycleLength)

        const phaseMaxTasks = {
            menstrual: 2,
            follicular: 3,
            ovulation: 5,
            luteal: 3
        }

        if (tasks.length > phaseMaxTasks[phase]) {
            overloaded.push({
                date: isoDate,
                phase,
                taskCount: tasks.length,
                maxRecommended: phaseMaxTasks[phase],
                tasks: tasks.map(t => ({ id: t.id, name: t.name }))
            })
        }

        currentDate = addDays(currentDate, 1)
    }

    return overloaded
}

/**
 * Suggest tasks to pull forward during high-energy phases
 * @param {Date} highEnergyDate - Date in high-energy phase
 * @param {string} periodStartDate - Period start date
 * @param {number} cycleLength - Cycle length
 * @returns {Promise<Array>} Suggested tasks to move forward
 */
export async function suggestTasksToPullForward(highEnergyDate, periodStartDate, cycleLength = 28) {
    const { phase } = getPhaseForDate(highEnergyDate, periodStartDate, cycleLength)

    // Only suggest during ovulation phase
    if (phase !== 'ovulation') return []

    const highEnergyISODate = toISODate(highEnergyDate)
    const currentTasks = await getTasksByDate(highEnergyISODate)

    // If already at capacity (5 tasks), don't suggest more
    if (currentTasks.length >= 5) return []

    // Look for medium-energy tasks in the next 2 weeks
    const incompleteTasks = await getIncompleteTasks()
    const candidates = incompleteTasks.filter(task => {
        if (!task.scheduledDate) return false

        const taskDate = parseISO(task.scheduledDate)
        const daysAway = Math.floor((taskDate - highEnergyDate) / (1000 * 60 * 60 * 24))

        return daysAway > 0 && daysAway <= 14 && task.energyLevel === 'medium'
    })

    return candidates.slice(0, 5 - currentTasks.length)
}

export default {
    scheduleTask,
    rescheduleAllTasks,
    findOverloadedDays,
    suggestTasksToPullForward
}
