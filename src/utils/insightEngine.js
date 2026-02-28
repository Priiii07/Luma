import { format, addDays, parseISO } from 'date-fns'
import { getPhaseForDateAdvanced } from './cycleHelpers'

/**
 * Phase-specific guidance messages
 */
const phaseGuidanceMap = {
    menstrual: [
        'Your body is resting. Prioritize gentle tasks and self-care today.',
        'Energy is naturally low during menstruation — be kind to yourself and keep your workload light.',
        'This is a great time for reflection, journaling, and low-effort creative work.'
    ],
    follicular: [
        'Your energy is rising! Great time to start new projects and tackle creative tasks.',
        'Follicular phase brings fresh motivation — plan ahead and set intentions for the cycle.',
        'Your brain is primed for learning and problem-solving right now.'
    ],
    ovulation: [
        'You\'re at peak energy! Schedule your most demanding tasks today.',
        'Communication and social energy are at their highest — perfect for meetings and collaboration.',
        'Take advantage of this high-energy window to knock out challenging work.'
    ],
    luteal: [
        'Energy is winding down. Focus on wrapping up projects and tying loose ends.',
        'Detail-oriented work suits this phase well — editing, organizing, and planning.',
        'Your body is preparing to rest soon. Ease into a lighter workload.'
    ]
}

/**
 * Generate insights based on current phase and task data
 * @param {Array} cycles - All logged cycles
 * @param {Array} tasks - All tasks
 * @returns {{ phaseGuidance: string|null, opportunities: string|null }}
 */
export function generateInsights(cycles, tasks) {
    const today = format(new Date(), 'yyyy-MM-dd')
    const currentPhase = getPhaseForDateAdvanced(today, cycles)

    let phaseGuidance = null
    let opportunities = null

    // Phase guidance
    if (currentPhase && phaseGuidanceMap[currentPhase]) {
        const messages = phaseGuidanceMap[currentPhase]
        // Pick a message based on day of month for variety
        const dayIndex = new Date().getDate() % messages.length
        phaseGuidance = messages[dayIndex]
    }

    // Opportunity detection: find free slots in upcoming high-energy days
    if (cycles.length >= 2) {
        const upcomingDays = 7
        let freeHighEnergySlots = 0
        const highEnergyDates = []

        for (let i = 1; i <= upcomingDays; i++) {
            const date = format(addDays(new Date(), i), 'yyyy-MM-dd')
            const phase = getPhaseForDateAdvanced(date, cycles)

            if (phase === 'follicular' || phase === 'ovulation') {
                const tasksOnDate = tasks.filter(t =>
                    t.scheduledDate === date && !t.completed
                )
                if (tasksOnDate.length < 2) {
                    freeHighEnergySlots++
                    highEnergyDates.push(date)
                }
            }
        }

        if (freeHighEnergySlots >= 2) {
            const startDate = format(parseISO(highEnergyDates[0]), 'MMM d')
            const endDate = format(parseISO(highEnergyDates[highEnergyDates.length - 1]), 'MMM d')
            opportunities = `${freeHighEnergySlots} free slots in your high-energy week (${startDate}–${endDate})`
        }
    }

    return { phaseGuidance, opportunities }
}
