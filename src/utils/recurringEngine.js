import { addDays, startOfDay, differenceInDays, format, subDays } from 'date-fns'
import { getPhaseForDateAdvanced } from './cycleHelpers'
import { toISODate } from './dateHelpers'
import {
    createTask,
    getAllRecurringDefinitions,
    getRecurringDefinition,
    updateRecurringDefinition,
    updateTask,
    deleteTask
} from './storageHelpers'

/**
 * Check if a recurring instance should be generated on a given date.
 *
 * @param {Date} date
 * @param {Object} recurrence - { type: 'daily'|'weekly'|'custom', interval: number, preferredDays: string[] }
 * @returns {boolean}
 */
export function shouldGenerateOnDate(date, recurrence) {
    const { type, interval, preferredDays } = recurrence

    switch (type) {
        case 'daily':
            return true

        case 'weekly': {
            const dayName = format(date, 'EEE') // 'Mon', 'Tue', etc.
            return (preferredDays || []).includes(dayName)
        }

        case 'custom': {
            // Every N days from epoch reference
            const daysSinceEpoch = differenceInDays(date, new Date('2020-01-01'))
            return daysSinceEpoch % (interval || 1) === 0
        }

        default:
            return false
    }
}

/**
 * Generate task instances for a recurring definition.
 * Generates from the day after the last existing instance (or today) up to
 * today + generationWindow days.
 *
 * @param {Object} definition - Recurring definition from DB
 * @param {Object[]} allTasks - All tasks currently in DB
 * @param {Object[]} cycles - All cycles
 * @param {Object} [userPreferences={}]
 * @returns {Promise<Object[]>} Newly created task instances
 */
export async function generateInstances(definition, allTasks, cycles, userPreferences = {}) {
    const {
        id: defId,
        name,
        energyLevel,
        recurrence,
        skipDuringMenstrual,
        generationWindow = 14
    } = definition

    // Find existing instances for this definition
    const existingInstances = allTasks.filter(t => t.recurringDefinitionId === defId)
    const existingDates = new Set(existingInstances.map(t => t.scheduledDate))

    // Determine start date: day after last instance, or today
    const today = startOfDay(new Date())
    let startDate = today

    if (existingInstances.length > 0) {
        const dates = existingInstances.map(t => new Date(t.scheduledDate))
        const maxDate = dates.reduce((a, b) => a > b ? a : b)
        const dayAfterLast = addDays(startOfDay(maxDate), 1)
        if (dayAfterLast > today) {
            startDate = dayAfterLast
        }
    }

    const endDate = addDays(today, generationWindow)
    let instanceNumber = existingInstances.length + 1
    const newInstances = []

    let current = startDate
    while (current <= endDate) {
        const dateStr = toISODate(current)

        // Skip if instance already exists for this date
        if (existingDates.has(dateStr)) {
            current = addDays(current, 1)
            continue
        }

        // Check if this date matches the recurrence pattern
        if (!shouldGenerateOnDate(current, recurrence)) {
            current = addDays(current, 1)
            continue
        }

        // Check menstrual skip
        if (skipDuringMenstrual && cycles.length > 0) {
            const phase = getPhaseForDateAdvanced(current, cycles)
            if (phase === 'menstrual') {
                current = addDays(current, 1)
                continue
            }
        }

        // Create instance
        const taskId = await createTask({
            name,
            energyLevel,
            scheduledDate: dateStr,
            deadline: null,
            preferredDays: recurrence.preferredDays || [],
            autoScheduled: true,
            recurringDefinitionId: defId,
            instanceNumber: instanceNumber,
            instanceStatus: 'active'
        })

        newInstances.push({ id: taskId, name, scheduledDate: dateStr, instanceNumber })
        instanceNumber++
        current = addDays(current, 1)
    }

    // Update lastGenerated timestamp on definition
    await updateRecurringDefinition(defId, {
        lastGenerated: new Date().toISOString()
    })

    return newInstances
}

/**
 * Check all active recurring definitions and regenerate instances
 * if they're running low (< 7 days of future instances).
 * Called on app load.
 *
 * @param {Object[]} allTasks
 * @param {Object[]} cycles
 * @param {Object} [userPreferences={}]
 * @returns {Promise<number>} Number of new instances generated
 */
export async function checkAndRegenerateAll(allTasks, cycles, userPreferences = {}) {
    const definitions = await getAllRecurringDefinitions()
    const today = startOfDay(new Date())
    let totalGenerated = 0

    for (const def of definitions) {
        if (!def.active) continue

        // Find future instances for this definition
        const futureInstances = allTasks.filter(t =>
            t.recurringDefinitionId === def.id &&
            new Date(t.scheduledDate) >= today &&
            !t.completed
        )

        // Find the furthest scheduled date
        let daysRemaining = 0
        if (futureInstances.length > 0) {
            const dates = futureInstances.map(t => new Date(t.scheduledDate))
            const maxDate = dates.reduce((a, b) => a > b ? a : b)
            daysRemaining = differenceInDays(maxDate, today)
        }

        // Regenerate if less than 7 days of future instances
        if (daysRemaining < 7) {
            const newInstances = await generateInstances(def, allTasks, cycles, userPreferences)
            totalGenerated += newInstances.length
            // Add new instances to allTasks for subsequent definitions' dedup
            allTasks = [...allTasks, ...newInstances.map(inst => ({
                ...inst,
                recurringDefinitionId: def.id,
                completed: false,
                instanceStatus: 'active'
            }))]
        }
    }

    return totalGenerated
}

/**
 * Mark past incomplete recurring instances as 'missed'.
 * Returns the list of newly-missed instances so the UI can show a banner.
 *
 * @param {Object[]} allTasks
 * @returns {Promise<Object[]>} List of tasks that were marked as missed
 */
export async function handleMissedInstances(allTasks) {
    const today = startOfDay(new Date())
    const gracePeriod = subDays(today, 7)

    const missedTasks = allTasks.filter(task =>
        task.recurringDefinitionId &&
        task.instanceStatus === 'active' &&
        !task.completed &&
        new Date(task.scheduledDate) < today &&
        new Date(task.scheduledDate) >= gracePeriod
    )

    for (const task of missedTasks) {
        await updateTask(task.id, { instanceStatus: 'missed' })
    }

    return missedTasks
}

/**
 * Stop a recurring series: deactivate definition and delete all future instances.
 * Past instances (completed/missed) are preserved.
 *
 * @param {number} definitionId
 * @param {Object[]} allTasks
 * @returns {Promise<number>} Number of future instances deleted
 */
export async function stopRecurringSeries(definitionId, allTasks) {
    // Deactivate definition
    await updateRecurringDefinition(definitionId, { active: false })

    const today = startOfDay(new Date())
    const futureInstances = allTasks.filter(t =>
        t.recurringDefinitionId === definitionId &&
        new Date(t.scheduledDate) >= today &&
        !t.completed
    )

    for (const task of futureInstances) {
        await deleteTask(task.id)
    }

    return futureInstances.length
}

/**
 * Handle recurring tasks when a new cycle is logged.
 * - For definitions with skipDuringMenstrual: delete future instances
 *   now in menstrual phase, then regenerate.
 *
 * @param {Object[]} allTasks
 * @param {Object[]} cycles
 * @param {Object} [userPreferences={}]
 * @returns {Promise<void>}
 */
export async function handleRecurringOnCycleUpdate(allTasks, cycles, userPreferences = {}) {
    const definitions = await getAllRecurringDefinitions()
    const today = startOfDay(new Date())

    for (const def of definitions) {
        if (!def.active) continue

        // Only process definitions that care about menstrual skipping
        if (!def.skipDuringMenstrual) continue

        const futureInstances = allTasks.filter(t =>
            t.recurringDefinitionId === def.id &&
            new Date(t.scheduledDate) > today &&
            t.autoScheduled &&
            !t.completed
        )

        for (const instance of futureInstances) {
            const phase = getPhaseForDateAdvanced(new Date(instance.scheduledDate), cycles)
            if (phase === 'menstrual') {
                await deleteTask(instance.id)
            }
        }
    }

    // Reload tasks after deletions and regenerate
    // (caller should reload tasks and pass fresh list)
    const freshTasks = allTasks.filter(t => {
        if (!t.recurringDefinitionId) return true
        if (new Date(t.scheduledDate) <= today) return true
        if (t.completed) return true
        // Check if it was deleted above
        const phase = getPhaseForDateAdvanced(new Date(t.scheduledDate), cycles)
        const def = definitions.find(d => d.id === t.recurringDefinitionId)
        if (def?.skipDuringMenstrual && phase === 'menstrual') return false
        return true
    })

    for (const def of definitions) {
        if (!def.active) continue
        await generateInstances(def, freshTasks, cycles, userPreferences)
    }
}

/**
 * Edit an entire recurring series: update the definition,
 * delete all future instances, and regenerate with new settings.
 *
 * @param {number} definitionId
 * @param {Object} updates - Fields to update on the definition
 * @param {Object[]} allTasks
 * @param {Object[]} cycles
 * @param {Object} [userPreferences={}]
 * @returns {Promise<Object[]>} Newly generated instances
 */
export async function editRecurringSeries(definitionId, updates, allTasks, cycles, userPreferences = {}) {
    // Update definition
    await updateRecurringDefinition(definitionId, updates)

    // Delete all future instances
    const today = startOfDay(new Date())
    const futureInstances = allTasks.filter(t =>
        t.recurringDefinitionId === definitionId &&
        new Date(t.scheduledDate) >= today &&
        !t.completed
    )

    for (const task of futureInstances) {
        await deleteTask(task.id)
    }

    // Get updated definition and regenerate
    const updatedDef = await getRecurringDefinition(definitionId)
    const remainingTasks = allTasks.filter(t =>
        !(t.recurringDefinitionId === definitionId &&
          new Date(t.scheduledDate) >= today &&
          !t.completed)
    )

    return await generateInstances(updatedDef, remainingTasks, cycles, userPreferences)
}
