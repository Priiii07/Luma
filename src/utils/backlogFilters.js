const PHASE_ENERGY_MAP = {
    menstrual: 'low',
    follicular: 'medium',
    ovulation: 'high',
    luteal: 'medium'
}

const ENERGY_LEVELS = { low: 1, medium: 2, high: 3 }

/**
 * Filter backlog tasks by available time and rank by energy match with current phase.
 * Always shows tasks that fit the time, even if energy doesn't match perfectly.
 */
export function filterTasksByTimeAndEnergy(tasks, timeAvailable, currentPhase) {
    if (!tasks || tasks.length === 0) return []

    const recommendedEnergy = PHASE_ENERGY_MAP[currentPhase] || 'medium'
    const recommendedLevel = ENERGY_LEVELS[recommendedEnergy]

    // Keep tasks that fit within available time (tasks without timeEstimate always included)
    let filtered = tasks.filter(task => {
        if (!task.timeEstimate) return true
        return task.timeEstimate <= timeAvailable
    })

    // Annotate with energy match quality
    filtered = filtered.map(task => {
        const taskLevel = ENERGY_LEVELS[task.energyLevel] || 2
        const energyDiff = Math.abs(taskLevel - recommendedLevel)
        const matchReason = energyDiff === 0 ? 'perfect' : energyDiff === 1 ? 'good' : 'doable'
        return { ...task, matchReason, energyDiff }
    })

    // Sort: best energy match first, then longer tasks first (makes better use of available time)
    filtered.sort((a, b) => {
        if (a.energyDiff !== b.energyDiff) return a.energyDiff - b.energyDiff
        return (b.timeEstimate || 0) - (a.timeEstimate || 0)
    })

    return filtered
}

/**
 * Get recommended energy level label for a given cycle phase.
 */
export function getPhaseEnergyLabel(phase) {
    return PHASE_ENERGY_MAP[phase] || 'medium'
}
