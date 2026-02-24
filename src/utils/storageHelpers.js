import { firestore } from '../firebase'
import {
    collection, doc, addDoc, getDoc, getDocs,
    updateDoc, deleteDoc, setDoc, query, where, orderBy, writeBatch, limit,
    onSnapshot
} from 'firebase/firestore'

// Module-level userId set by AuthContext after login
let currentUserId = null

export function setCurrentUserId(uid) {
    currentUserId = uid
}

// Helper to get user-scoped collection reference
function userCol(collectionName) {
    if (!currentUserId) throw new Error('No authenticated user')
    return collection(firestore, 'users', currentUserId, collectionName)
}

// Helper to get user-scoped document reference
function userDoc(collectionName, docId) {
    if (!currentUserId) throw new Error('No authenticated user')
    return doc(firestore, 'users', currentUserId, collectionName, String(docId))
}

// Helper for the single preferences document
function preferencesDoc() {
    if (!currentUserId) throw new Error('No authenticated user')
    return doc(firestore, 'users', currentUserId, 'preferences', 'settings')
}

// ==================== TASKS ====================

/**
 * Create a new task
 * @param {Object} task - Task object
 * @returns {Promise<string>} Task ID
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
        createdAt: new Date().toISOString(),
        autoScheduled: task.autoScheduled !== undefined ? task.autoScheduled : false,
        recurringDefinitionId: task.recurringDefinitionId || null,
        instanceNumber: task.instanceNumber || null,
        instanceStatus: task.instanceStatus || null
    }

    const docRef = await addDoc(userCol('tasks'), taskData)
    await logTaskHistory(docRef.id, 'created', { taskData })
    return docRef.id
}

/**
 * Get all tasks
 * @returns {Promise<Array>} All tasks
 */
export async function getAllTasks() {
    const snapshot = await getDocs(userCol('tasks'))
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
}

/**
 * Get incomplete tasks
 * @returns {Promise<Array>} Incomplete tasks
 */
export async function getIncompleteTasks() {
    const q = query(userCol('tasks'), where('completed', '==', false))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
}

/**
 * Get tasks by scheduled date
 * @param {string} date - Date in ISO format
 * @returns {Promise<Array>} Tasks scheduled for that date
 */
export async function getTasksByDate(date) {
    const q = query(userCol('tasks'), where('scheduledDate', '==', date))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
}

/**
 * Update a task
 * @param {string|number} taskId - Task ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<number>} Number of updated records
 */
export async function updateTask(taskId, updates) {
    await updateDoc(userDoc('tasks', taskId), updates)
    await logTaskHistory(taskId, 'updated', { updates })
    return 1
}

/**
 * Mark task as complete
 * @param {string|number} taskId - Task ID
 * @returns {Promise<number>} Number of updated records
 */
export async function completeTask(taskId) {
    await updateDoc(userDoc('tasks', taskId), {
        completed: true,
        completedAt: new Date().toISOString()
    })
    await logTaskHistory(taskId, 'completed')
    return 1
}

/**
 * Delete a task
 * @param {string|number} taskId - Task ID
 * @returns {Promise<void>}
 */
export async function deleteTask(taskId) {
    await logTaskHistory(taskId, 'deleted')
    await deleteDoc(userDoc('tasks', taskId))
}

/**
 * Split a task into smaller tasks
 * @param {string|number} taskId - Original task ID
 * @param {Array<Object>} newTasks - Array of new task objects
 * @returns {Promise<Array<string>>} Array of new task IDs
 */
export async function splitTask(taskId, newTasks) {
    const snap = await getDoc(userDoc('tasks', taskId))
    const originalTask = { id: snap.id, ...snap.data() }

    const newTaskIds = []
    for (const task of newTasks) {
        const id = await createTask({
            ...task,
            energyLevel: task.energyLevel || originalTask.energyLevel,
            deadline: task.deadline || originalTask.deadline
        })
        newTaskIds.push(id)
    }

    await completeTask(taskId)
    await logTaskHistory(taskId, 'split', { newTaskIds })
    return newTaskIds
}

// ==================== CYCLES ====================

/**
 * Remove cycles that overlap with a new period
 * @param {string} newStartDate - New period start date (YYYY-MM-DD)
 * @param {string} [newEndDate] - New period end date (YYYY-MM-DD, optional)
 * @returns {Promise<number>} Number of cycles removed
 */
export async function removeOverlappingCycles(newStartDate, newEndDate = null) {
    const { parseISO, addDays } = await import('date-fns')
    const newStart = parseISO(newStartDate)

    let newEnd = newStart
    if (newEndDate) {
        newEnd = parseISO(newEndDate)
    } else {
        newEnd = addDays(newStart, 7)
    }

    const allCycles = await getAllCycles()
    let removedCount = 0

    for (const cycle of allCycles) {
        const existingStart = parseISO(cycle.startDate)

        let existingEnd = existingStart
        if (cycle.endDate) {
            existingEnd = parseISO(cycle.endDate)
        } else if (cycle.phases?.menstrual?.end) {
            existingEnd = parseISO(cycle.phases.menstrual.end)
        } else {
            existingEnd = addDays(existingStart, 5)
        }

        const hasOverlap = (newStart <= existingEnd) && (newEnd >= existingStart)

        if (hasOverlap) {
            await deleteDoc(userDoc('cycles', cycle.id))
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
    const q = query(userCol('cycles'), orderBy('startDate', 'desc'))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
}

/**
 * Log a new menstrual cycle period
 * @param {Object} cycle - Cycle object
 * @returns {Promise<string>} Cycle ID
 */
export async function logCycle(cycle) {
    await removeOverlappingCycles(cycle.startDate, cycle.endDate)

    const { createCycleEntry } = await import('./cycleHelpers')
    const existingCycles = await getAllCycles()

    const cycleEntry = createCycleEntry(
        cycle.startDate,
        cycle.endDate || null,
        existingCycles
    )

    const cycleData = {
        ...cycleEntry,
        createdAt: new Date().toISOString()
    }

    const docRef = await addDoc(userCol('cycles'), cycleData)
    return docRef.id
}

/**
 * Get the most recent cycle
 * @returns {Promise<Object|undefined>} Most recent cycle
 */
export async function getLatestCycle() {
    const q = query(userCol('cycles'), orderBy('startDate', 'desc'), limit(1))
    const snapshot = await getDocs(q)
    if (snapshot.empty) return undefined
    const d = snapshot.docs[0]
    return { id: d.id, ...d.data() }
}

/**
 * Update a cycle
 * @param {string|number} cycleId - Cycle ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<number>} Number of updated records
 */
export async function updateCycle(cycleId, updates) {
    await updateDoc(userDoc('cycles', cycleId), updates)
    return 1
}

/**
 * Delete a cycle
 * @param {string|number} cycleId - Cycle ID
 * @returns {Promise<void>}
 */
export async function deleteCycle(cycleId) {
    await deleteDoc(userDoc('cycles', cycleId))
}

/**
 * Update all cycle lengths when new cycle is logged
 * @returns {Promise<void>}
 */
export async function updateAllCycleLengths() {
    const { updateCycleLengths } = await import('./cycleHelpers')
    const allCycles = await getAllCycles()
    const updated = updateCycleLengths(allCycles)

    for (const cycle of updated) {
        if (cycle.id) {
            await updateDoc(userDoc('cycles', cycle.id), { cycleLength: cycle.cycleLength })
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

// ==================== RECURRING DEFINITIONS ====================

/**
 * Create a new recurring task definition
 * @param {Object} def - Recurring definition
 * @returns {Promise<string>} Definition ID
 */
export async function createRecurringDefinition(def) {
    const data = {
        name: def.name,
        energyLevel: def.energyLevel || null,
        recurrence: def.recurrence,
        skipDuringMenstrual: def.skipDuringMenstrual || false,
        generationWindow: def.generationWindow || 14,
        active: true,
        createdAt: new Date().toISOString(),
        lastGenerated: new Date().toISOString()
    }
    const docRef = await addDoc(userCol('recurringDefinitions'), data)
    return docRef.id
}

/**
 * Get all recurring definitions
 * @returns {Promise<Array>}
 */
export async function getAllRecurringDefinitions() {
    const snapshot = await getDocs(userCol('recurringDefinitions'))
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
}

/**
 * Get a single recurring definition
 * @param {string|number} id
 * @returns {Promise<Object|undefined>}
 */
export async function getRecurringDefinition(id) {
    const snap = await getDoc(userDoc('recurringDefinitions', id))
    if (!snap.exists()) return undefined
    return { id: snap.id, ...snap.data() }
}

/**
 * Update a recurring definition
 * @param {string|number} id
 * @param {Object} updates
 * @returns {Promise<number>}
 */
export async function updateRecurringDefinition(id, updates) {
    await updateDoc(userDoc('recurringDefinitions', id), updates)
    return 1
}

/**
 * Delete a recurring definition
 * @param {string|number} id
 * @returns {Promise<void>}
 */
export async function deleteRecurringDefinition(id) {
    await deleteDoc(userDoc('recurringDefinitions', id))
}

// ==================== TASK HISTORY ====================

/**
 * Log task history event
 * @param {string|number} taskId - Task ID
 * @param {string} action - Action type
 * @param {Object} [metadata] - Additional metadata
 * @returns {Promise<string>} History entry ID
 */
export async function logTaskHistory(taskId, action, metadata = {}) {
    const docRef = await addDoc(userCol('taskHistory'), {
        taskId: String(taskId),
        action,
        metadata,
        timestamp: new Date().toISOString()
    })
    return docRef.id
}

/**
 * Get task history
 * @param {string|number} taskId - Task ID
 * @returns {Promise<Array>} History entries for the task
 */
export async function getTaskHistory(taskId) {
    const q = query(
        userCol('taskHistory'),
        where('taskId', '==', String(taskId)),
        orderBy('timestamp')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ==================== SETTINGS ====================

/**
 * Save a setting
 * @param {string} key - Setting key
 * @param {any} value - Setting value
 * @returns {Promise<string>} Setting key
 */
export async function saveSetting(key, value) {
    await setDoc(preferencesDoc(), { [key]: value }, { merge: true })
    return key
}

/**
 * Get a setting
 * @param {string} key - Setting key
 * @param {any} defaultValue - Default value if not found
 * @returns {Promise<any>} Setting value
 */
export async function getSetting(key, defaultValue = null) {
    try {
        const snap = await getDoc(preferencesDoc())
        if (!snap.exists()) return defaultValue
        const data = snap.data()
        return data[key] !== undefined ? data[key] : defaultValue
    } catch {
        return defaultValue
    }
}

/**
 * Get all settings
 * @returns {Promise<Object>} All settings as key-value object
 */
export async function getAllSettings() {
    try {
        const snap = await getDoc(preferencesDoc())
        return snap.exists() ? snap.data() : {}
    } catch {
        return {}
    }
}

// ==================== UTILITIES ====================

/**
 * Clear all data (for testing/reset)
 * @returns {Promise<void>}
 */
export async function clearAllData() {
    const collections = ['tasks', 'cycles', 'taskHistory', 'recurringDefinitions']

    for (const colName of collections) {
        const snapshot = await getDocs(userCol(colName))
        const docs = snapshot.docs
        for (let i = 0; i < docs.length; i += 500) {
            const batch = writeBatch(firestore)
            const chunk = docs.slice(i, i + 500)
            chunk.forEach(d => batch.delete(d.ref))
            await batch.commit()
        }
    }

    try {
        await deleteDoc(preferencesDoc())
    } catch {
        // Preferences doc may not exist
    }
}

/**
 * Export all data (for backup)
 * @returns {Promise<Object>} All data
 */
export async function exportData() {
    const taskHistorySnapshot = await getDocs(userCol('taskHistory'))
    const taskHistory = taskHistorySnapshot.docs.map(d => ({ id: d.id, ...d.data() }))

    return {
        tasks: await getAllTasks(),
        cycles: await getAllCycles(),
        taskHistory,
        settings: await getAllSettings(),
        recurringDefinitions: await getAllRecurringDefinitions()
    }
}

/**
 * Import data (for restore)
 * @param {Object} data - Data to import
 * @returns {Promise<void>}
 */
export async function importData(data) {
    if (data.tasks) {
        for (const item of data.tasks) {
            const { id, ...taskData } = item
            await addDoc(userCol('tasks'), taskData)
        }
    }
    if (data.cycles) {
        for (const item of data.cycles) {
            const { id, ...cycleData } = item
            await addDoc(userCol('cycles'), cycleData)
        }
    }
    if (data.taskHistory) {
        for (const item of data.taskHistory) {
            const { id, ...historyData } = item
            await addDoc(userCol('taskHistory'), historyData)
        }
    }
    if (data.recurringDefinitions) {
        for (const item of data.recurringDefinitions) {
            const { id, ...defData } = item
            await addDoc(userCol('recurringDefinitions'), defData)
        }
    }
    if (data.settings) {
        if (Array.isArray(data.settings)) {
            const settingsObj = data.settings.reduce((acc, { key, value }) => {
                acc[key] = value
                return acc
            }, {})
            await setDoc(preferencesDoc(), settingsObj)
        } else {
            await setDoc(preferencesDoc(), data.settings)
        }
    }
}

// ==================== REAL-TIME SUBSCRIPTIONS ====================

/**
 * Subscribe to real-time task updates
 * @param {Function} callback - Called with updated tasks array
 * @returns {Function} Unsubscribe function
 */
export function subscribeTasks(callback) {
    if (!currentUserId) return () => {}
    return onSnapshot(userCol('tasks'), (snapshot) => {
        const tasks = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
        callback(tasks)
    })
}

/**
 * Subscribe to real-time cycle updates
 * @param {Function} callback - Called with updated cycles array
 * @returns {Function} Unsubscribe function
 */
export function subscribeCycles(callback) {
    if (!currentUserId) return () => {}
    const q = query(userCol('cycles'), orderBy('startDate', 'desc'))
    return onSnapshot(q, (snapshot) => {
        const cycles = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
        callback(cycles)
    })
}
