import Dexie from 'dexie'

// Initialize Dexie database
export const db = new Dexie('CyclePlannerDB')

// Define database schema
db.version(1).stores({
    // Tasks table
    tasks: '++id, name, deadline, energyLevel, completedAt, createdAt',

    // Cycle periods table (logged menstrual periods)
    cycles: '++id, startDate, endDate, createdAt',

    // Task history for tracking changes
    taskHistory: '++id, taskId, action, timestamp',

    // User settings
    settings: 'key, value'
})

// ==================== TASKS ====================

/**
 * Create a new task
 * @param {Object} task - Task object
 * @param {string} task.name - Task name (required)
 * @param {string} [task.deadline] - Deadline date (ISO string)
 * @param {Array<string>} [task.preferredDays] - Array of preferred days ['Mon', 'Tue', etc.]
 * @param {string} [task.energyLevel] - Energy level: 'low', 'medium', 'high'
 * @param {string} [task.scheduledDate] - Auto-assigned scheduled date (ISO string)
 * @returns {Promise<number>} Task ID
 */
export async function createTask(task) {
    const taskData = {
        name: task.name,
        deadline: task.deadline || null,
        preferredDays: task.preferredDays || [],
        energyLevel: task.energyLevel || null,
        scheduledDate: task.scheduledDate || null,
        completed: false,
        completedAt: null,
        createdAt: new Date().toISOString()
    }

    const taskId = await db.tasks.add(taskData)

    // Log creation in history
    await logTaskHistory(taskId, 'created', { taskData })

    return taskId
}

/**
 * Get all tasks
 * @returns {Promise<Array>} All tasks
 */
export async function getAllTasks() {
    return await db.tasks.toArray()
}

/**
 * Get incomplete tasks
 * @returns {Promise<Array>} Incomplete tasks
 */
export async function getIncompleteTasks() {
    return await db.tasks.where('completed').equals(false).toArray()
}

/**
 * Get tasks by scheduled date
 * @param {string} date - Date in ISO format
 * @returns {Promise<Array>} Tasks scheduled for that date
 */
export async function getTasksByDate(date) {
    return await db.tasks.where('scheduledDate').equals(date).toArray()
}

/**
 * Update a task
 * @param {number} taskId - Task ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<number>} Number of updated records
 */
export async function updateTask(taskId, updates) {
    const result = await db.tasks.update(taskId, updates)

    // Log update in history
    await logTaskHistory(taskId, 'updated', { updates })

    return result
}

/**
 * Mark task as complete
 * @param {number} taskId - Task ID
 * @returns {Promise<number>} Number of updated records
 */
export async function completeTask(taskId) {
    const result = await db.tasks.update(taskId, {
        completed: true,
        completedAt: new Date().toISOString()
    })

    await logTaskHistory(taskId, 'completed')

    return result
}

/**
 * Delete a task
 * @param {number} taskId - Task ID
 * @returns {Promise<void>}
 */
export async function deleteTask(taskId) {
    await logTaskHistory(taskId, 'deleted')
    await db.tasks.delete(taskId)
}

/**
 * Split a task into smaller tasks
 * @param {number} taskId - Original task ID
 * @param {Array<Object>} newTasks - Array of new task objects
 * @returns {Promise<Array<number>>} Array of new task IDs
 */
export async function splitTask(taskId, newTasks) {
    const originalTask = await db.tasks.get(taskId)

    // Create new tasks
    const newTaskIds = []
    for (const task of newTasks) {
        const id = await createTask({
            ...task,
            energyLevel: task.energyLevel || originalTask.energyLevel,
            deadline: task.deadline || originalTask.deadline
        })
        newTaskIds.push(id)
    }

    // Mark original as completed
    await completeTask(taskId)
    await logTaskHistory(taskId, 'split', { newTaskIds })

    return newTaskIds
}

// ==================== CYCLES ====================

/**
 * Remove cycles that overlap with a new period
 * Uses proper date range overlap detection to ensure user entries always replace predictions
 * @param {string} newStartDate - New period start date (YYYY-MM-DD)
 * @param {string} [newEndDate] - New period end date (YYYY-MM-DD, optional)
 * @returns {Promise<number>} Number of cycles removed
 */
export async function removeOverlappingCycles(newStartDate, newEndDate = null) {
    const { parseISO, addDays } = await import('date-fns')
    const newStart = parseISO(newStartDate)

    // Calculate end date for overlap checking
    let newEnd = newStart
    if (newEndDate) {
        newEnd = parseISO(newEndDate)
    } else {
        // If no end date provided, assume 7 days (conservative estimate)
        newEnd = addDays(newStart, 7)
    }

    // Get all existing cycles
    const allCycles = await db.cycles.toArray()

    let removedCount = 0

    for (const cycle of allCycles) {
        const existingStart = parseISO(cycle.startDate)

        // Determine existing cycle's end date
        let existingEnd = existingStart
        if (cycle.endDate) {
            existingEnd = parseISO(cycle.endDate)
        } else if (cycle.phases?.menstrual?.end) {
            existingEnd = parseISO(cycle.phases.menstrual.end)
        } else {
            // Default to 5 days if no end date available
            existingEnd = addDays(existingStart, 5)
        }

        // Check for ANY overlap between date ranges
        // Ranges overlap if: (start1 <= end2) AND (end1 >= start2)
        const hasOverlap = (newStart <= existingEnd) && (newEnd >= existingStart)

        if (hasOverlap) {
            await db.cycles.delete(cycle.id)
            removedCount++
        }
    }

    return removedCount
}

/**
 * Get all cycles sorted by start date (descending)
 * @returns {Promise<Array>} Array of cycles
 */
export async function getAllCycles() {
    return await db.cycles.orderBy('startDate').reverse().toArray()
}

/**
 * Log a new menstrual cycle period
 * @param {Object} cycle - Cycle object
 * @param {string} cycle.startDate - Start date (ISO string)
 * @param {string} [cycle.endDate] - End date (ISO string)
 * @param {number} [cycle.cycleLength] - Expected cycle length for phase calculation
 * @returns {Promise<number>} Cycle ID
 */
export async function logCycle(cycle) {
    // Remove any overlapping cycles first
    await removeOverlappingCycles(cycle.startDate, cycle.endDate)

    // Import cycle helpers dynamically
    const { createCycleEntry } = await import('./cycleHelpers')

    // Fetch existing cycles BEFORE adding the new one so averaging works correctly
    const existingCycles = await getAllCycles()

    // Create complete cycle entry with phases
    const cycleEntry = createCycleEntry(
        cycle.startDate,
        cycle.endDate || null,
        existingCycles
    )

    // Store in database
    const cycleData = {
        ...cycleEntry,
        createdAt: new Date().toISOString()
    }

    return await db.cycles.add(cycleData)
}

/**
 * Get the most recent cycle
 * @returns {Promise<Object|undefined>} Most recent cycle
 */
export async function getLatestCycle() {
    return await db.cycles.orderBy('startDate').last()
}

/**
 * Update a cycle
 * @param {number} cycleId - Cycle ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<number>} Number of updated records
 */
export async function updateCycle(cycleId, updates) {
    return await db.cycles.update(cycleId, updates)
}

/**
 * Delete a cycle
 * @param {number} cycleId - Cycle ID
 * @returns {Promise<void>}
 */
export async function deleteCycle(cycleId) {
    await db.cycles.delete(cycleId)
}

/**
 * Update all cycle lengths when new cycle is logged
 * Updates the cycleLength field of previous cycles
 * @returns {Promise<void>}
 */
export async function updateAllCycleLengths() {
    const { updateCycleLengths } = await import('./cycleHelpers')

    // Get all cycles
    const allCycles = await getAllCycles()

    // Calculate updated cycle lengths
    const updated = updateCycleLengths(allCycles)

    // Update each cycle in the database
    for (const cycle of updated) {
        if (cycle.id) {
            await db.cycles.update(cycle.id, { cycleLength: cycle.cycleLength })
        }
    }
}

/**
 * Get cycle statistics
 * @returns {Promise<Object>} Cycle statistics
 */
export async function getCycleStats() {
    const { getCycleStatistics } = await import('./cycleHelpers')
    const allCycles = await getAllCycles()
    return getCycleStatistics(allCycles)
}

// ==================== TASK HISTORY ====================

/**
 * Log task history event
 * @param {number} taskId - Task ID
 * @param {string} action - Action type (created, updated, completed, deleted, split, rescheduled)
 * @param {Object} [metadata] - Additional metadata
 * @returns {Promise<number>} History entry ID
 */
export async function logTaskHistory(taskId, action, metadata = {}) {
    return await db.taskHistory.add({
        taskId,
        action,
        metadata,
        timestamp: new Date().toISOString()
    })
}

/**
 * Get task history
 * @param {number} taskId - Task ID
 * @returns {Promise<Array>} History entries for the task
 */
export async function getTaskHistory(taskId) {
    return await db.taskHistory
        .where('taskId')
        .equals(taskId)
        .sortBy('timestamp')
}

// ==================== SETTINGS ====================

/**
 * Save a setting
 * @param {string} key - Setting key
 * @param {any} value - Setting value
 * @returns {Promise<string>} Setting key
 */
export async function saveSetting(key, value) {
    await db.settings.put({ key, value })
    return key
}

/**
 * Get a setting
 * @param {string} key - Setting key
 * @param {any} defaultValue - Default value if not found
 * @returns {Promise<any>} Setting value
 */
export async function getSetting(key, defaultValue = null) {
    const setting = await db.settings.get(key)
    return setting ? setting.value : defaultValue
}

/**
 * Get all settings
 * @returns {Promise<Object>} All settings as key-value object
 */
export async function getAllSettings() {
    const settings = await db.settings.toArray()
    return settings.reduce((acc, { key, value }) => {
        acc[key] = value
        return acc
    }, {})
}

// ==================== UTILITIES ====================

/**
 * Clear all data (for testing/reset)
 * @returns {Promise<void>}
 */
export async function clearAllData() {
    await db.tasks.clear()
    await db.cycles.clear()
    await db.taskHistory.clear()
    await db.settings.clear()
}

/**
 * Export all data (for backup)
 * @returns {Promise<Object>} All data
 */
export async function exportData() {
    return {
        tasks: await db.tasks.toArray(),
        cycles: await db.cycles.toArray(),
        taskHistory: await db.taskHistory.toArray(),
        settings: await db.settings.toArray()
    }
}

/**
 * Import data (for restore)
 * @param {Object} data - Data to import
 * @returns {Promise<void>}
 */
export async function importData(data) {
    if (data.tasks) await db.tasks.bulkAdd(data.tasks)
    if (data.cycles) await db.cycles.bulkAdd(data.cycles)
    if (data.taskHistory) await db.taskHistory.bulkAdd(data.taskHistory)
    if (data.settings) await db.settings.bulkAdd(data.settings)
}

export default db
