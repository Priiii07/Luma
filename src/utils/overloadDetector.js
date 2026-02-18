import { addDays, startOfDay, format } from 'date-fns'
import { getPhaseForDateAdvanced } from './cycleHelpers'
import { toISODate } from './dateHelpers'
import { getCapacityForPhase } from './capacityHelpers'

/**
 * Group the next `daysAhead` days into consecutive same-phase periods.
 * Used by both overloadDetector and optimizationEngine.
 *
 * @param {Object[]} cycles
 * @param {number} daysAhead
 * @returns {{ phase: string, start: Date, end: Date }[]}
 */
export function getUpcomingPhasePeriods(cycles, daysAhead = 30) {
    const today = startOfDay(new Date())
    const periods = []
    let current = null

    for (let i = 0; i < daysAhead; i++) {
        const date = addDays(today, i)
        const phase = getPhaseForDateAdvanced(date, cycles) || 'luteal'

        if (!current || current.phase !== phase) {
            if (current) periods.push(current)
            current = { phase, start: date, end: date }
        } else {
            current.end = date
        }
    }
    if (current) periods.push(current)

    return periods
}

/**
 * Detect three types of problems in the next 30 days:
 *   1. Overload — more than 3 tasks during menstrual phase
 *   2. Energy mismatch — high-energy task in menstrual/luteal phase
 *   3. Underutilized ovulation — ≥ 2 free slots during peak-energy week
 *
 * Each warning has a unique `id` for dismissal tracking.
 *
 * @param {Object[]} tasks
 * @param {Object[]} cycles
 * @returns {Object[]} warnings
 */
export function detectOverloadSituations(tasks, cycles, userPreferences = {}) {
    if (!tasks.length || !cycles.length) return []

    const warnings = []
    const phasePeriods = getUpcomingPhasePeriods(cycles, 30)
    const activeTasks = tasks.filter(t => !t.completed && t.scheduledDate)

    for (const period of phasePeriods) {
        const periodStart = toISODate(period.start)
        const periodEnd = toISODate(period.end)

        const tasksInPhase = activeTasks.filter(
            t => t.scheduledDate >= periodStart && t.scheduledDate <= periodEnd
        )

        // Scenario 1: Overload during menstrual phase (rest period)
        if (period.phase === 'menstrual' && tasksInPhase.length > 3) {
            const highEnergyCount = tasksInPhase.filter(t => t.energyLevel === 'high').length
            warnings.push({
                id: `overload-${periodStart}`,
                type: 'overload',
                severity: highEnergyCount > 0 ? 'high' : 'medium',
                phase: 'menstrual',
                phaseStart: period.start,
                phaseEnd: period.end,
                taskCount: tasksInPhase.length,
                affectedTasks: tasksInPhase,
                message: `${tasksInPhase.length} tasks during your period (${format(period.start, 'MMM d')}–${format(period.end, 'MMM d')})`,
                recommendation: 'Consider moving some tasks to later in your cycle.'
            })
        }

        // Scenario 2: High-energy task placed in low-energy phase
        if (['menstrual', 'luteal'].includes(period.phase)) {
            const mismatched = tasksInPhase.filter(t => t.energyLevel === 'high')
            for (const task of mismatched) {
                warnings.push({
                    id: `mismatch-${task.id}`,
                    type: 'energy_mismatch',
                    severity: 'medium',
                    phase: period.phase,
                    task,
                    message: `"${task.name}" needs high energy but lands in ${period.phase} phase`,
                    recommendation: task.deadline
                        ? 'Has a deadline — consider splitting it or adjusting the deadline.'
                        : 'Move to your ovulation window for a better energy match.'
                })
            }
        }

        // Scenario 3: Underutilized ovulation (peak energy going to waste)
        if (period.phase === 'ovulation') {
            const availableSlots = getCapacityForPhase('ovulation', userPreferences) - tasksInPhase.length
            if (availableSlots >= 2) {
                warnings.push({
                    id: `underutilized-${periodStart}`,
                    type: 'underutilized',
                    severity: 'low',
                    phase: 'ovulation',
                    phaseStart: period.start,
                    phaseEnd: period.end,
                    availableSlots,
                    message: `${availableSlots} free slots in your high-energy week (${format(period.start, 'MMM d')}–${format(period.end, 'MMM d')})`,
                    recommendation: 'Pull forward tasks from later weeks to use this peak energy time.'
                })
            }
        }
    }

    return warnings
}
