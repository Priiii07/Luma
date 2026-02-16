import { useState, useEffect } from 'react'
import { format, addMonths, subMonths } from 'date-fns'
import Header from './components/Cycle/Header'
import Navigation from './components/Calendar/Navigation'
import Legend from './components/Calendar/Legend'
import SmartBanner from './components/Task/SmartBanner'
import Calendar from './components/Calendar/Calendar'
import TaskSidebar from './components/Task/TaskSidebar'
import PeriodSidebar from './components/Cycle/PeriodSidebar'
import OnboardingFlow from './components/Onboarding/OnboardingFlow'
import { getAllCycles, getAllTasks } from './utils/storageHelpers'
import { getCurrentPhaseInfo } from './utils/cycleHelpers' // Keep this import for now, as the instruction doesn't explicitly remove it from here, only adds it to storageHelpers. This might be a future refactor.

// Import test function (remove in production)
import { testStorage } from './utils/testStorage'

// Make test available in console
if (typeof window !== 'undefined') {
  window.testStorage = testStorage
}

function App() {
  // Use Date object for month navigation
  const [currentDate, setCurrentDate] = useState(new Date(2026, 1, 1)) // February 2026
  const [showTaskSidebar, setShowTaskSidebar] = useState(false)
  const [showPeriodSidebar, setShowPeriodSidebar] = useState(false)
  const [cycles, setCycles] = useState([])
  const [tasks, setTasks] = useState([])
  const [currentPhaseInfo, setCurrentPhaseInfo] = useState({ phase: null, cycleDay: null })

  // Load cycles and tasks on mount
  useEffect(() => {
    loadCycles()
    loadTasks()
  }, [])

  const loadCycles = async () => {
    try {
      const allCycles = await getAllCycles()
      setCycles(allCycles)

      // Get current phase info
      const phaseInfo = getCurrentPhaseInfo(allCycles)
      setCurrentPhaseInfo(phaseInfo)
    } catch (error) {
      console.error('Error loading cycles:', error)
    }
  }

  const loadTasks = async () => {
    try {
      const allTasks = await getAllTasks()
      setTasks(allTasks)
    } catch (error) {
      console.error('Error loading tasks:', error)
    }
  }

  const handleCycleLogged = () => {
    // Reload cycles when new one is logged - return the promise so callers can await it
    return loadCycles()
  }

  // Called when onboarding finishes — reload cycles so the overlay hides
  const handleOnboardingComplete = async () => {
    await loadCycles()
  }

  const handleTaskCreated = () => {
    // Reload tasks when new one is created
    loadTasks()
  }

  const handlePrevMonth = () => {
    setCurrentDate(prevDate => subMonths(prevDate, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(prevDate => addMonths(prevDate, 1))
  }

  const handleAddTask = () => {
    setShowTaskSidebar(true)
    setShowPeriodSidebar(false)
  }

  const handleLogPeriod = () => {
    setShowPeriodSidebar(true)
    setShowTaskSidebar(false)
  }

  const isOnboarded = cycles.length >= 2

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden my-5">
        <Header
          currentPhase={currentPhaseInfo.phase || 'Unknown'}
          cycleDay={currentPhaseInfo.cycleDay || 0}
        />
        <Navigation
          month={format(currentDate, 'MMMM')}
          year={format(currentDate, 'yyyy')}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onAddTask={handleAddTask}
          onLogPeriod={handleLogPeriod}
          isOnboarded={isOnboarded}
          cyclesLogged={cycles.length}
        />
        <Legend />
        <SmartBanner phase={currentPhaseInfo.phase} />
        <Calendar key={cycles.length} currentDate={currentDate} cycles={cycles} tasks={tasks} />
      </div>

      {/* Sidebars */}
      <TaskSidebar
        isOpen={showTaskSidebar}
        onClose={() => setShowTaskSidebar(false)}
        onTaskCreated={handleTaskCreated}
        cycles={cycles}
        tasks={tasks}
      />
      <PeriodSidebar
        isOpen={showPeriodSidebar}
        onClose={() => setShowPeriodSidebar(false)}
        onCycleLogged={handleCycleLogged}
        cycles={cycles}
      />

      {/* Onboarding overlay — shown until 2 cycles are logged */}
      {!isOnboarded && (
        <OnboardingFlow
          cyclesLogged={cycles.length}
          onComplete={handleOnboardingComplete}
        />
      )}
    </div>
  )
}

export default App