import { parseISO, startOfDay } from 'date-fns'
import { scoreDate } from './taskScoringEngine'
import { scheduleTask } from './taskScheduler'
import { updateTask, logTaskHistory } from './storageHelpers'
import { toISODate } from './dateHelpers'

/**
 * Score a task's current scheduled date with the latest cycle data.
 */
function scoreCurrentDate(task, allTasks, cycles, userPreferences) {
    if (!task.scheduledDate) return { totalScore: 0, breakdown: {} }
    return scoreDate(parseISO(task.scheduledDate), task, allTasks, cycles, userPreferences)
}

/**
 * Build a human-readable reason string from two score breakdowns.
 */
function buildReason(current, proposed) {
    if (!current.breakdown || !proposed.breakdown) return 'overall better fit'
    const parts = []
    const eDiff = (proposed.breakdown.energyMatch || 0) - (current.breakdown.energyMatch || 0)
    if (eDiff > 20) parts.push('better energy match')
    const wDiff = (proposed.breakdown.workloadBalance || 0) - (current.breakdown.workloadBalance || 0)
    if (wDiff > 20) parts.push('lighter workload')
    return parts.length > 0 ? parts.join(' + ') : 'overall better fit'
}

/**
 * After a cycle update, re-score all future auto-scheduled tasks and determine
 * whether they should move.
 *
 * Criteria for suggesting a reschedule:
 *   - Task is auto-scheduled (not manually placed)
 *   - Task is in the future and not completed
 *   - A better date exists with ≥ 20 point improvement
 *
 * Returns:
 *   - mode: 'automatic' | 'suggestions' (based on userPreferences)
 *   - suggestions: all candidate reschedules
 *   - rescheduled: tasks actually moved (automatic mode only)
 *
 * @param {Object[]} allTasks
 * @param {Object[]} cycles
 * @param {Object} userPreferences
 * @returns {Promise<{ mode: string, suggestions: Object[], rescheduled: Object[] }>}
 */
export async function checkAndReschedule(allTasks, cycles, userPreferences) {
    if (!cycles.length || !allTasks.length) {
        return { mode: userPreferences.reschedulingBehavior, suggestions: [], rescheduled: [] }
    }

    const todayStr = toISODate(startOfDay(new Date()))

    // Only future, incomplete, auto-scheduled tasks are eligible
    const candidates = allTasks.filter(t =>
        t.autoScheduled &&
        !t.completed &&
        t.scheduledDate &&
        t.scheduledDate > todayStr
    )

    const suggestions = []

    for (const task of candidates) {
        const currentScore = scoreCurrentDate(task, allTasks, cycles, userPreferences)
        const bestDate = scheduleTask(task, allTasks, cycles, userPreferences)

        if (bestDate === task.scheduledDate) continue // Already optimal

        const proposedScore = scoreDate(parseISO(bestDate), task, allTasks, cycles, userPreferences)
        const improvement = proposedScore.totalScore - currentScore.totalScore

        if (improvement >= 20) {
            suggestions.push({
                task,
                currentDate: task.scheduledDate,
                currentScore: Math.round(currentScore.totalScore),
                suggestedDate: bestDate,
                suggestedScore: Math.round(proposedScore.totalScore),
                scoreImprovement: Math.round(improvement),
                reason: buildReason(currentScore, proposedScore)
            })
        }
    }

    if (suggestions.length === 0) {
        return { mode: userPreferences.reschedulingBehavior, suggestions: [], rescheduled: [] }
    }

    if (userPreferences.reschedulingBehavior === 'automatic') {
        const rescheduled = await applyRescheduling(suggestions)
        return { mode: 'automatic', suggestions, rescheduled }
    }

    // ask_permission mode: return suggestions for UI review
    return { mode: 'suggestions', suggestions, rescheduled: [] }
}

/**
 * Persist a list of reschedule suggestions to the DB.
 * Updates scheduledDate and logs a 'rescheduled' history entry for each task.
 *
 * @param {Object[]} suggestions
 * @returns {Promise<Object[]>} updated task objects
 */
export async function applyRescheduling(suggestions) {
    const rescheduled = []
    for (const s of suggestions) {
        await updateTask(s.task.id, {
            scheduledDate: s.suggestedDate,
            autoScheduled: true
        })
        await logTaskHistory(s.task.id, 'rescheduled', {
            trigger: 'cycle_update',
            from: s.currentDate,
            to: s.suggestedDate,
            scoreImprovement: s.scoreImprovement,
            reason: s.reason
        })
        rescheduled.push({ ...s.task, scheduledDate: s.suggestedDate })
    }
    return rescheduled
}
