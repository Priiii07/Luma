/**
 * Single source of truth for daily task capacity.
 *
 * Capacity = round(dailyTaskLimit × phaseMultiplier)
 *
 * The multipliers below reproduce the original hardcoded values when
 * dailyTaskLimit = 4 (the default):
 *   menstrual  → 4 × 0.50 = 2
 *   follicular → 4 × 0.75 = 3
 *   ovulation  → 4 × 1.25 = 5
 *   luteal     → 4 × 0.75 = 3
 */
export const PHASE_MULTIPLIERS = {
    menstrual: 0.50,   // Rest period — lower capacity
    follicular: 0.75,  // Building energy — moderate
    ovulation: 1.25,   // Peak energy — highest capacity
    luteal: 0.75       // Winding down — moderate
}

const DEFAULT_DAILY_LIMIT = 4

/**
 * Maximum tasks allowed for a given phase, adjusted by user's daily task limit.
 *
 * @param {string} phase - 'menstrual' | 'follicular' | 'ovulation' | 'luteal'
 * @param {Object} [userPreferences={}]
 * @returns {number} max tasks (minimum 1)
 */
export function getCapacityForPhase(phase, userPreferences = {}) {
    const base = userPreferences.dailyTaskLimit || DEFAULT_DAILY_LIMIT
    const multiplier = PHASE_MULTIPLIERS[phase] ?? PHASE_MULTIPLIERS.luteal
    return Math.max(1, Math.round(base * multiplier))
}
