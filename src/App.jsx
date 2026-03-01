import { useState, useEffect } from "react";
import { format, addMonths, subMonths } from "date-fns";
import Header from "./components/Cycle/Header";
import TabBar from "./components/Navigation/TabBar";
import DesktopSidebar from "./components/Navigation/DesktopSidebar";
import HomeTab from "./components/Tabs/HomeTab";
import CalendarTab from "./components/Tabs/CalendarTab";
import TasksTab from "./components/Tabs/TasksTab";
import ProfileTab from "./components/Tabs/ProfileTab";
import TaskSidebar from "./components/Task/TaskSidebar";
import PeriodSidebar from "./components/Cycle/PeriodSidebar";
import OnboardingFlow from "./components/Onboarding/OnboardingFlow";
import RescheduleReviewPanel from "./components/RescheduleReviewPanel";
import TaskDetailModal from "./components/Task/TaskDetailModal";
import PrivacyModal from "./components/PrivacyModal";
import TaskPopupModal from "./components/TaskPopupModal";
import InstallPrompt from "./components/InstallPrompt";
import LoginPage from "./components/Auth/LoginPage";
import MigrationPrompt from "./components/Auth/MigrationPrompt";
import TabLoading from "./components/TabLoading";
import {
  getAllCycles,
  getAllTasks,
  updateTask,
  logTaskHistory,
  subscribeTasks,
  subscribeCycles,
} from "./utils/storageHelpers";
import { getCurrentPhaseInfo } from "./utils/cycleHelpers";
import { detectOverloadSituations } from "./utils/overloadDetector";
import { checkAndReschedule } from "./utils/reschedulingEngine";
import { suggestPullForward } from "./utils/optimizationEngine";
import { checkAndRegenerateAll, handleMissedInstances, handleRecurringOnCycleUpdate } from "./utils/recurringEngine";
import { loadUserPreferences } from "./store/userPreferences";
import { useAuth } from "./contexts/AuthContext";
import { hasLocalData, isMigrationComplete } from "./utils/migrationTool";

// Import test function (remove in production)
import { testStorage } from "./utils/testStorage";

// Make test available in console
if (typeof window !== "undefined") {
  window.testStorage = testStorage;
}

function App() {
  const { user } = useAuth();

  // Tab navigation
  const [activeTab, setActiveTab] = useState('home');

  const [currentDate, setCurrentDate] = useState(new Date());
  const [showTaskSidebar, setShowTaskSidebar] = useState(false);
  const [showPeriodSidebar, setShowPeriodSidebar] = useState(false);
  const [cycles, setCycles] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [currentPhaseInfo, setCurrentPhaseInfo] = useState({
    phase: null,
    cycleDay: null,
  });

  // Intelligence layer state
  const [userPreferences, setUserPreferences] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [dismissedWarnings, setDismissedWarnings] = useState(new Set());
  const [rescheduleSuggestions, setRescheduleSuggestions] = useState([]);
  const [pullForwardSuggestions, setPullForwardSuggestions] = useState([]);
  const [showReviewPanel, setShowReviewPanel] = useState(false);
  const [rescheduleNotification, setRescheduleNotification] = useState(0);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showPrivacy, setShowPrivacy] = useState(false);

  // Recurring tasks state
  const [missedInstances, setMissedInstances] = useState([]);

  // Migration state
  const [showMigrationPrompt, setShowMigrationPrompt] = useState(false);

  // Mobile task popup state
  const [popupDateStr, setPopupDateStr] = useState(null);

  const loadPreferences = async () => {
    const prefs = await loadUserPreferences();
    setUserPreferences(prefs);
  };

  /* eslint-disable react-hooks/set-state-in-effect */

  // Set up real-time subscriptions and run initial checks when authenticated
  useEffect(() => {
    if (!user) return;

    // Check for local data to migrate
    (async () => {
      const alreadyMigrated = await isMigrationComplete(user.uid);
      if (!alreadyMigrated) {
        const hasData = await hasLocalData();
        if (hasData) {
          setShowMigrationPrompt(true);
        }
      }
    })();

    // Set up real-time listeners
    const unsubTasks = subscribeTasks((allTasks) => {
      setTasks(allTasks);
    });
    const unsubCycles = subscribeCycles((allCycles) => {
      setCycles(allCycles);
      setCurrentPhaseInfo(getCurrentPhaseInfo(allCycles));
    });

    async function init() {
      await loadPreferences();

      // Fetch initial data for recurring task checks
      const [loadedCycles, loadedTasks] = await Promise.all([
        getAllCycles(),
        getAllTasks()
      ]);

      // Run recurring task checks after initial data load
      if (loadedCycles.length >= 2 && loadedTasks.length >= 0) {
        try {
          const prefs = await loadUserPreferences();

          // Regenerate recurring instances if needed
          await checkAndRegenerateAll(loadedTasks, loadedCycles, prefs);

          // Check for missed recurring instances
          const missed = await handleMissedInstances(loadedTasks);
          setMissedInstances(missed);
        } catch (error) {
          console.error("Error in recurring task checks:", error);
        }
      }
    }
    init();

    return () => {
      unsubTasks();
      unsubCycles();
    };
  }, [user]);

  // Recalculate warnings + pull-forward whenever tasks, cycles, or preferences change
  useEffect(() => {
    if (!userPreferences) return;
    if (tasks.length > 0 && cycles.length > 0) {
      if (userPreferences.notifications.overloadWarnings) {
        setWarnings(detectOverloadSituations(tasks, cycles, userPreferences));
      }
      if (userPreferences.notifications.pullForwardSuggestions) {
        setPullForwardSuggestions(suggestPullForward(tasks, cycles));
      }
    }
  }, [tasks, cycles, userPreferences]);

  // Open review panel automatically when new suggestions arrive
  useEffect(() => {
    if (rescheduleSuggestions.length > 0 || pullForwardSuggestions.length > 0) {
      setShowReviewPanel(true);
    }
  }, [rescheduleSuggestions, pullForwardSuggestions]);

  /* eslint-enable react-hooks/set-state-in-effect */

  // After a period is logged: run rescheduling check
  const handleCycleLogged = async () => {
    const newCycles = await getAllCycles();
    const currentTasks = await getAllTasks();

    if (newCycles.length < 2) return;

    const prefs = await loadUserPreferences();
    setUserPreferences(prefs);

    try {
      const result = await checkAndReschedule(currentTasks, newCycles, prefs);

      if (result.mode === "automatic" && result.rescheduled.length > 0) {
        if (prefs.notifications.cycleUpdateNotifications) {
          setRescheduleNotification(result.rescheduled.length);
          setTimeout(() => setRescheduleNotification(0), 6000);
        }
      } else if (
        result.mode === "suggestions" &&
        result.suggestions.length > 0
      ) {
        setRescheduleSuggestions(result.suggestions);
      }

      await handleRecurringOnCycleUpdate(currentTasks, newCycles, prefs);
    } catch (error) {
      console.error("Error running reschedule check:", error);
    }
  };

  const handleOnboardingComplete = async () => {
    await loadPreferences();
  };

  const handleTaskCreated = () => {
    // onSnapshot handles task refresh automatically
  };

  const handlePrevMonth = () => {
    setCurrentDate((prevDate) => subMonths(prevDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prevDate) => addMonths(prevDate, 1));
  };

  const handleAddTask = () => {
    setShowTaskSidebar(true);
    setShowPeriodSidebar(false);
  };

  const handleLogPeriod = () => {
    setShowPeriodSidebar(true);
    setShowTaskSidebar(false);
  };

  const handleTaskMoved = async (task, newDateStr) => {
    try {
      const oldDate = task.scheduledDate;
      await updateTask(task.id, {
        scheduledDate: newDateStr,
        autoScheduled: false,
      });
      await logTaskHistory(task.id, "rescheduled", {
        from: oldDate,
        to: newDateStr,
        trigger: "manual_drag",
      });
    } catch (error) {
      console.error("Error moving task:", error);
    }
  };

  const handleDismissWarning = (id) => {
    setDismissedWarnings((prev) => new Set([...prev, id]));
  };

  const handleReviewPanelClosed = () => {
    setShowReviewPanel(false);
    setRescheduleSuggestions([]);
  };

  const handleDataCleared = () => {
    setCycles([]);
    setTasks([]);
    setCurrentPhaseInfo({ phase: null, cycleDay: null });
    setWarnings([]);
    setMissedInstances([]);
    setUserPreferences(null);
    loadPreferences();
  };

  const handleDataImported = async () => {
    await loadPreferences();
  };

  const handleMissedReschedule = async (task) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    await updateTask(task.id, {
      scheduledDate: today,
      instanceStatus: 'active'
    });
    setMissedInstances(prev => prev.filter(t => t.id !== task.id));
  };

  const handleDayClick = (dateStr) => {
    if (window.innerWidth < 768) {
      setPopupDateStr(dateStr);
    }
  };

  const handleMissedDismiss = async (task) => {
    setMissedInstances(prev => prev.filter(t => t.id !== task.id));
  };

  const isOnboarded = cycles.length >= 2;
  const visibleWarnings = warnings.filter((w) => !dismissedWarnings.has(w.id));
  const dataLoading = !userPreferences;

  // Show login page if not authenticated
  if (!user) return <LoginPage />;

  // Show migration prompt if local data found
  if (showMigrationPrompt) {
    return (
      <MigrationPrompt
        userId={user.uid}
        onComplete={() => setShowMigrationPrompt(false)}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Ambient background orbs */}
      <div className="ember-bg">
        <div className="ember-orb-1" />
        <div className="ember-orb-2" />
      </div>

      <div className="flex-1 flex flex-col relative z-[1]">
        {/* Header with desktop tab nav */}
        <Header
          currentPhase={currentPhaseInfo.phase || "Unknown"}
          cycleDay={currentPhaseInfo.cycleDay || 0}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Main layout: desktop sidebar + tab content */}
        <div className="app-layout">
          {/* Desktop sidebar */}
          <DesktopSidebar
            currentPhaseInfo={currentPhaseInfo}
            cycles={cycles}
            tasks={tasks}
            isOnboarded={isOnboarded}
            onLogPeriod={handleLogPeriod}
            onAddTask={handleAddTask}
          />

          {/* Tab content */}
          <div className="tab-content">
           <div className="tab-panel" key={activeTab}>
            {dataLoading && activeTab !== 'calendar' && <TabLoading />}
            {activeTab === 'home' && !dataLoading && (
              <HomeTab
                currentPhaseInfo={currentPhaseInfo}
                tasks={tasks}
                cycles={cycles}
                warnings={visibleWarnings}
                missedInstances={missedInstances}
                pullForwardSuggestions={pullForwardSuggestions}
                showReviewPanel={showReviewPanel}
                rescheduleNotification={rescheduleNotification}
                isOnboarded={isOnboarded}
                onAddTask={handleAddTask}
                onTaskClick={setSelectedTask}
                onToggleComplete={() => {/* onSnapshot handles refresh */}}
                onDismissWarning={handleDismissWarning}
                onMissedReschedule={handleMissedReschedule}
                onMissedDismiss={handleMissedDismiss}
                onSetRescheduleNotification={setRescheduleNotification}
                onOpenReviewPanel={() => setShowReviewPanel(true)}
                onTabChange={setActiveTab}
              />
            )}

            {activeTab === 'calendar' && (
              <CalendarTab
                currentDate={currentDate}
                cycles={cycles}
                tasks={tasks}
                isOnboarded={isOnboarded}
                cyclesLogged={cycles.length}
                onPrevMonth={handlePrevMonth}
                onNextMonth={handleNextMonth}
                onAddTask={handleAddTask}
                onLogPeriod={handleLogPeriod}
                onTaskClick={setSelectedTask}
                onTaskMoved={handleTaskMoved}
                onDayClick={handleDayClick}
                onTabChange={setActiveTab}
              />
            )}

            {activeTab === 'tasks' && (
              <TasksTab
                tasks={tasks}
                onTaskClick={setSelectedTask}
                onAddTask={handleAddTask}
                onToggleComplete={() => {/* onSnapshot handles refresh */}}
                isOnboarded={isOnboarded}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileTab
                cycles={cycles}
                preferences={userPreferences}
                onPreferencesChanged={setUserPreferences}
                onDataCleared={handleDataCleared}
                onDataImported={handleDataImported}
                onLogPeriod={handleLogPeriod}
                onAddTask={handleAddTask}
                onOpenPrivacy={() => setShowPrivacy(true)}
                isOnboarded={isOnboarded}
              />
            )}
           </div>
          </div>
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Global overlays */}
      <TaskSidebar
        isOpen={showTaskSidebar}
        onClose={() => setShowTaskSidebar(false)}
        onTaskCreated={handleTaskCreated}
        cycles={cycles}
        tasks={tasks}
        userPreferences={userPreferences}
      />
      <PeriodSidebar
        isOpen={showPeriodSidebar}
        onClose={() => setShowPeriodSidebar(false)}
        onCycleLogged={handleCycleLogged}
        cycles={cycles}
      />

      {/* Reschedule / pull-forward review modal */}
      <RescheduleReviewPanel
        isOpen={showReviewPanel}
        onClose={handleReviewPanelClosed}
        suggestions={rescheduleSuggestions}
        pullForward={pullForwardSuggestions}
        onApplied={() => {/* onSnapshot handles refresh */}}
      />

      {/* Task detail modal */}
      <TaskDetailModal
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onSaved={() => {/* onSnapshot handles refresh */}}
        onDeleted={() => {/* onSnapshot handles refresh */}}
        cycles={cycles}
        tasks={tasks}
        userPreferences={userPreferences}
      />

      {/* Mobile task popup */}
      {popupDateStr && (
        <TaskPopupModal
          dateStr={popupDateStr}
          tasks={tasks}
          onClose={() => setPopupDateStr(null)}
          onAddTask={handleAddTask}
          onTaskUpdated={() => {/* onSnapshot handles refresh */}}
        />
      )}

      {/* Privacy modal */}
      <PrivacyModal
        isOpen={showPrivacy}
        onClose={() => setShowPrivacy(false)}
      />

      {/* PWA install prompt */}
      <InstallPrompt />

      {/* Onboarding overlay — shown until 2 cycles are logged */}
      {!isOnboarded && (
        <OnboardingFlow
          cyclesLogged={cycles.length}
          onComplete={handleOnboardingComplete}
        />
      )}
    </div>
  );
}

export default App;
