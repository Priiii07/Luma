/**
 * Test file to verify IndexedDB storage functionality
 * Open browser console and run: window.testStorage()
 */

import {
    createTask,
    getAllTasks,
    getIncompleteTasks,
    updateTask,
    completeTask,
    deleteTask,
    logCycle,
    getAllCycles,
    getLatestCycle,
    clearAllData,
    exportData
} from './storageHelpers'

import {
    getPhaseForDate,
    predictNextPeriod,
    calculateAverageCycleLength
} from './dateHelpers'

import {
    scheduleTask
} from './schedulingEngine'

/**
 * Run all storage tests
 */
export async function testStorage() {
    console.log('🧪 Starting Storage Tests...\n')

    try {
        // Clear existing data
        console.log('1️⃣ Clearing existing data...')
        await clearAllData()
        console.log('✅ Data cleared\n')

        // Test 1: Create tasks
        console.log('2️⃣ Creating test tasks...')
        const task1Id = await createTask({
            name: 'Finish presentation slides',
            energyLevel: 'high',
            deadline: '2026-02-20',
            preferredDays: ['Mon', 'Tue', 'Wed']
        })

        const task2Id = await createTask({
            name: 'Grocery shopping',
            energyLevel: 'medium',
            preferredDays: ['Sat', 'Sun']
        })

        const task3Id = await createTask({
            name: 'Light reading',
            energyLevel: 'low'
        })

        console.log(`✅ Created 3 tasks: ${task1Id}, ${task2Id}, ${task3Id}\n`)

        // Test 2: Retrieve tasks
        console.log('3️⃣ Retrieving all tasks...')
        const allTasks = await getAllTasks()
        console.log(`✅ Found ${allTasks.length} tasks:`)
        allTasks.forEach(task => {
            console.log(`   - ${task.name} (${task.energyLevel || 'no energy set'})`)
        })
        console.log('')

        // Test 3: Update a task
        console.log('4️⃣ Updating task...')
        await updateTask(task1Id, {
            scheduledDate: '2026-02-18',
            deadline: '2026-02-22'
        })
        const updatedTask = (await getAllTasks()).find(t => t.id === task1Id)
        console.log(`✅ Updated task scheduled for: ${updatedTask.scheduledDate}\n`)

        // Test 4: Complete a task
        console.log('5️⃣ Completing a task...')
        await completeTask(task3Id)
        const incompleteTasks = await getIncompleteTasks()
        console.log(`✅ Incomplete tasks remaining: ${incompleteTasks.length}\n`)

        // Test 5: Log cycle periods
        console.log('6️⃣ Logging menstrual cycles...')
        await logCycle({
            startDate: '2026-01-05',
            endDate: '2026-01-09'
        })

        await logCycle({
            startDate: '2026-02-01',
            endDate: '2026-02-05'
        })

        const cycles = await getAllCycles()
        console.log(`✅ Logged ${cycles.length} cycles`)
        cycles.forEach(cycle => {
            console.log(`   - Started: ${cycle.startDate}`)
        })
        console.log('')

        // Test 6: Calculate cycle info
        console.log('7️⃣ Testing cycle calculations...')
        const latestCycle = await getLatestCycle()
        const avgLength = calculateAverageCycleLength(cycles)
        const nextPeriod = predictNextPeriod(latestCycle.startDate, avgLength)

        console.log(`✅ Latest cycle: ${latestCycle.startDate}`)
        console.log(`✅ Average cycle length: ${avgLength} days`)
        console.log(`✅ Predicted next period: ${nextPeriod.toISOString().split('T')[0]}\n`)

        // Test 7: Phase calculation
        console.log('8️⃣ Testing phase calculations...')
        const testDate = new Date('2026-02-14')
        const phaseInfo = getPhaseForDate(testDate, latestCycle.startDate, avgLength)
        console.log(`✅ Phase for Feb 14: ${phaseInfo.phase} (Day ${phaseInfo.dayInCycle})\n`)

        // Test 8: Smart scheduling
        console.log('9️⃣ Testing smart scheduling...')
        const scheduledDate = await scheduleTask(
            {
                name: 'Important presentation',
                energyLevel: 'high',
                deadline: '2026-02-28',
                preferredDays: ['Wed', 'Thu']
            },
            latestCycle.startDate,
            avgLength
        )
        console.log(`✅ Task auto-scheduled to: ${scheduledDate}\n`)

        // Test 9: Export data
        console.log('🔟 Exporting all data...')
        const exportedData = await exportData()
        console.log(`✅ Exported ${exportedData.tasks.length} tasks`)
        console.log(`✅ Exported ${exportedData.cycles.length} cycles`)
        console.log(`✅ Exported ${exportedData.taskHistory.length} history entries\n`)

        console.log('🎉 All tests passed!')
        console.log('\n📊 Final Data Summary:')
        console.log(JSON.stringify(exportedData, null, 2))

        return exportedData

    } catch (error) {
        console.error('❌ Test failed:', error)
        throw error
    }
}

// Make test function available globally
if (typeof window !== 'undefined') {
    window.testStorage = testStorage
}

export default testStorage
