import Dexie from 'dexie'
import { firestore } from '../firebase'
import { collection, addDoc, doc, setDoc, getDoc } from 'firebase/firestore'

/**
 * Check if local Dexie/IndexedDB has data worth migrating.
 * @returns {Promise<boolean>}
 */
export async function hasLocalData() {
    try {
        const db = new Dexie('CyclePlannerDB')
        db.version(2).stores({
            tasks: '++id, name, deadline, energyLevel, completedAt, createdAt, recurringDefinitionId',
            cycles: '++id, startDate, endDate, createdAt',
            taskHistory: '++id, taskId, action, timestamp',
            settings: 'key, value',
            recurringDefinitions: '++id, active, createdAt'
        })
        const taskCount = await db.tasks.count()
        const cycleCount = await db.cycles.count()
        db.close()
        return (taskCount + cycleCount) > 0
    } catch {
        return false
    }
}

/**
 * Check if migration has already been completed for this user.
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export async function isMigrationComplete(userId) {
    try {
        const metaRef = doc(firestore, 'users', userId, 'meta', 'migrated')
        const snap = await getDoc(metaRef)
        return snap.exists()
    } catch {
        return false
    }
}

/**
 * Migrate all data from local Dexie to Firestore for the given userId.
 * Returns counts of migrated items.
 *
 * @param {string} userId
 * @param {Function} [onProgress] - Progress callback (step, total)
 * @returns {Promise<Object>} Migration results
 */
export async function migrateToFirestore(userId, onProgress = () => {}) {
    const db = new Dexie('CyclePlannerDB')
    db.version(2).stores({
        tasks: '++id, name, deadline, energyLevel, completedAt, createdAt, recurringDefinitionId',
        cycles: '++id, startDate, endDate, createdAt',
        taskHistory: '++id, taskId, action, timestamp',
        settings: 'key, value',
        recurringDefinitions: '++id, active, createdAt'
    })

    const idMap = {
        tasks: {},
        cycles: {},
        recurringDefinitions: {},
        taskHistory: {}
    }

    const counts = { tasks: 0, cycles: 0, recurringDefinitions: 0, taskHistory: 0, settings: 0 }

    // Calculate total items for progress
    const allDefs = await db.recurringDefinitions.toArray()
    const allTasks = await db.tasks.toArray()
    const allCycles = await db.cycles.toArray()
    const allHistory = await db.taskHistory.toArray()
    const allSettings = await db.settings.toArray()
    const totalItems = allDefs.length + allTasks.length + allCycles.length + allHistory.length + (allSettings.length > 0 ? 1 : 0)
    let completed = 0

    // 1. Migrate recurring definitions first (tasks reference them)
    for (const def of allDefs) {
        const { id: oldId, ...data } = def
        const ref = await addDoc(
            collection(firestore, 'users', userId, 'recurringDefinitions'),
            data
        )
        idMap.recurringDefinitions[oldId] = ref.id
        counts.recurringDefinitions++
        completed++
        onProgress(completed, totalItems)
    }

    // 2. Migrate tasks (rewrite recurringDefinitionId references)
    for (const task of allTasks) {
        const { id: oldId, ...data } = task
        if (data.recurringDefinitionId) {
            data.recurringDefinitionId =
                idMap.recurringDefinitions[data.recurringDefinitionId] || String(data.recurringDefinitionId)
        }
        const ref = await addDoc(
            collection(firestore, 'users', userId, 'tasks'),
            data
        )
        idMap.tasks[oldId] = ref.id
        counts.tasks++
        completed++
        onProgress(completed, totalItems)
    }

    // 3. Migrate cycles
    for (const cycle of allCycles) {
        const { id: oldId, ...data } = cycle
        const ref = await addDoc(
            collection(firestore, 'users', userId, 'cycles'),
            data
        )
        idMap.cycles[oldId] = ref.id
        counts.cycles++
        completed++
        onProgress(completed, totalItems)
    }

    // 4. Migrate task history (rewrite taskId references)
    for (const entry of allHistory) {
        const { id: oldId, ...data } = entry
        data.taskId = idMap.tasks[data.taskId] || String(data.taskId)
        await addDoc(
            collection(firestore, 'users', userId, 'taskHistory'),
            data
        )
        counts.taskHistory++
        completed++
        onProgress(completed, totalItems)
    }

    // 5. Migrate settings (Dexie key-value pairs → single Firestore doc)
    if (allSettings.length > 0) {
        const settingsObj = allSettings.reduce((acc, { key, value }) => {
            acc[key] = value
            return acc
        }, {})
        await setDoc(
            doc(firestore, 'users', userId, 'preferences', 'settings'),
            settingsObj
        )
        counts.settings = allSettings.length
        completed++
        onProgress(completed, totalItems)
    }

    // Mark migration as complete
    await setDoc(
        doc(firestore, 'users', userId, 'meta', 'migrated'),
        { migratedAt: new Date().toISOString(), counts }
    )

    db.close()
    return counts
}

/**
 * Delete local Dexie database after successful migration.
 * @returns {Promise<void>}
 */
export async function deleteLocalDatabase() {
    await Dexie.delete('CyclePlannerDB')
}
