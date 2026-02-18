import { addDays, startOfDay } from 'date-fns'
import { getUpcomingPhasePeriods } from './overloadDetector'
import { scoreDate } from './taskScoringEngine'
import { toISODate } from './dateHelpers'

const OVULATION_CAPACITY = 5

/**
 * Find the best available date within a phase period for a given task.
 * Uses scoring so the task lands on the optimal day within the window.
 */
function findBestDateInPeriod(periodStart, periodEnd, task, allTasks, cycles) {
    const today = startOfDay(new Date())
    let start = startOfDay(periodStart)
    if (start < today) start = today
    const end = startOfDay(periodEnd)

    const candidates = []
    let d = new Date(start)
    while (d <= end) {
        candidates.push(new Date(d))
        d = addDays(d, 1)
    }

    if (candidates.length === 0) return toISODate(periodStart)

    const scored = candidates.map(date => scoreDate(date, task, allTasks, cycles))
    scored.sort((a, b) => b.totalScore - a.totalScore)
    return toISODate(scored[0].date)
}

/**
 * Find upcoming ovulation periods that have ≥ 2 free slots, then identify
 * tasks scheduled after those periods that would benefit from moving forward.
 *
 * Only auto-scheduled tasks without deadlines are eligible (medium or high energy).
 * High-energy tasks are prioritised over medium.
 *
 * @param {Object[]} tasks
 * @param {Object[]} cycles
 * @returns {{ period: Object, availableSlots: number, candidates: Object[] }[]}
 */
export function suggestPullForward(tasks, cycles) {
    if (!tasks.length || !cycles.length) return []

    // Look further ahead than overload detector so we catch future ovulation windows
    const ovulationPeriods = getUpcomingPhasePeriods(cycles, 45)
        .filter(p => p.phase === 'ovulation')

    const activeTasks = tasks.filter(t => !t.completed && t.scheduledDate)
    const suggestions = []

    for (const period of ovulationPeriods) {
        const periodStart = toISODate(period.start)
        const periodEnd = toISODate(period.end)

        const tasksInPhase = activeTasks.filter(
            t => t.scheduledDate >= periodStart && t.scheduledDate <= periodEnd
        )

        const available = OVULATION_CAPACITY - tasksInPhase.length
        if (available < 2) continue

        // Candidates: auto-scheduled, no deadline, medium/high energy, scheduled AFTER this period
        const candidates = activeTasks
            .filter(t =>
                t.scheduledDate > periodEnd &&
                !t.deadline &&
                (t.energyLevel === 'high' || t.energyLevel === 'medium') &&
                t.autoScheduled
            )
            .sort((a, b) => {
                // High energy first, then earlier scheduled date
                if (a.energyLevel === 'high' && b.energyLevel !== 'high') return -1
                if (b.energyLevel === 'high' && a.energyLevel !== 'high') return 1
                return a.scheduledDate.localeCompare(b.scheduledDate)
            })
            .slice(0, available)

        if (candidates.length === 0) continue

        suggestions.push({
            period,
            availableSlots: available,
            candidates: candidates.map(task => ({
                task,
                currentDate: task.scheduledDate,
                suggestedDate: findBestDateInPeriod(
                    period.start, period.end, task, activeTasks, cycles
                ),
                energyMatch: task.energyLevel === 'high' ? 'Perfect' : 'Good'
            }))
        })
    }

    return suggestions
}
