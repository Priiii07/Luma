import { getSetting, saveSetting } from '../utils/storageHelpers'

export const DEFAULT_PREFERENCES = {
    reschedulingBehavior: 'ask_permission', // 'automatic' | 'ask_permission'
    dailyTaskLimit: 4, // Base limit per day; multiplied by phase modifier
    schedulingWeights: {
        energyMatch: 0.40,
        deadlineUrgency: 0.30,
        workloadBalance: 0.20,
        dayPreference: 0.10
    },
    notifications: {
        overloadWarnings: true,
        pullForwardSuggestions: true,
        cycleUpdateNotifications: true
    }
}

const SETTINGS_KEY = 'userPreferences'

/**
 * Load preferences from IndexedDB, merged with defaults.
 * @returns {Promise<Object>}
 */
export async function loadUserPreferences() {
    const stored = await getSetting(SETTINGS_KEY, null)
    if (!stored) return { ...DEFAULT_PREFERENCES }
    return {
        ...DEFAULT_PREFERENCES,
        ...stored,
        dailyTaskLimit: stored.dailyTaskLimit ?? DEFAULT_PREFERENCES.dailyTaskLimit,
        schedulingWeights: {
            ...DEFAULT_PREFERENCES.schedulingWeights,
            ...(stored.schedulingWeights || {})
        },
        notifications: {
            ...DEFAULT_PREFERENCES.notifications,
            ...(stored.notifications || {})
        }
    }
}

/**
 * Persist preferences to IndexedDB.
 * @param {Object} prefs
 * @returns {Promise<Object>} saved preferences
 */
export async function saveUserPreferences(prefs) {
    await saveSetting(SETTINGS_KEY, prefs)
    return prefs
}
