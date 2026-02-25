import { useState, useEffect } from "react";
import { format, addMonths, subMonths } from "date-fns";
import Header from "./components/Cycle/Header";
import Navigation from "./components/Calendar/Navigation";
import Legend from "./components/Calendar/Legend";
import SmartBanner from "./components/Task/SmartBanner";
import Calendar from "./components/Calendar/Calendar";
import TaskSidebar from "./components/Task/TaskSidebar";
import PeriodSidebar from "./components/Cycle/PeriodSidebar";
import OnboardingFlow from "./components/Onboarding/OnboardingFlow";
import OverloadBanner from "./components/OverloadBanner";
import MissedInstanceBanner from "./components/MissedInstanceBanner";
import RescheduleReviewPanel from "./components/RescheduleReviewPanel";
import SettingsPanel from "./components/Settings/SettingsPanel";
import TaskDetailModal from "./components/Task/TaskDetailModal";
import PrivacyModal from "./components/PrivacyModal";
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
import LoginPage from "./components/Auth/LoginPage";
import MigrationPrompt from "./components/Auth/MigrationPrompt";
import InstallPrompt from "./components/InstallPrompt";
import { hasLocalData, isMigrationComplete } from "./utils/migrationTool";

// Import test function (remove in production)
import { testStorage } from "./utils/testStorage";

// Make test available in console
if (typeof window !== "undefined") {
  window.testStorage = testStorage;
}

function App() {
  const { user } = useAuth();

  const [currentDate, setCurrentDate] = useState(new Date(2026, 1, 1)); // February 2026
  const [showTaskSidebar, setShowTaskSidebar] = useState(false);
  const [showPeriodSidebar, setShowPeriodSidebar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
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

  // After a period is logged: run rescheduling check (onSnapshot handles state updates)
  const handleCycleLogged = async () => {
    const newCycles = await getAllCycles();
    const currentTasks = await getAllTasks();

    if (newCycles.length < 2) return; // Need at least 2 cycles for meaningful reschedule

    // Load fresh preferences from DB so we never act on stale/null state
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

      // Handle recurring tasks on cycle update
      await handleRecurringOnCycleUpdate(currentTasks, newCycles, prefs);
    } catch (error) {
      console.error("Error running reschedule check:", error);
    }
  };

  const handleOnboardingComplete = async () => {
    // onSnapshot handles data refresh; just reload preferences
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
    setShowSettings(false);
    loadPreferences();
  };

  const handleDataImported = async () => {
    // onSnapshot handles data refresh; just reload preferences
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

  const handleMissedDismiss = async (task) => {
    setMissedInstances(prev => prev.filter(t => t.id !== task.id));
  };

  const isOnboarded = cycles.length >= 2;
  const visibleWarnings = warnings.filter((w) => !dismissedWarnings.has(w.id));

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
        <Header
          currentPhase={currentPhaseInfo.phase || "Unknown"}
          cycleDay={currentPhaseInfo.cycleDay || 0}
        />
        <Navigation
          month={format(currentDate, "MMMM")}
          year={format(currentDate, "yyyy")}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onAddTask={handleAddTask}
          onLogPeriod={handleLogPeriod}
          onOpenSettings={() => setShowSettings(true)}
          isOnboarded={isOnboarded}
          cyclesLogged={cycles.length}
        />
        <Legend />
        <SmartBanner phase={currentPhaseInfo.phase} />

        {/* Overload / energy-mismatch warning banners */}
        <OverloadBanner
          warnings={visibleWarnings}
          onDismiss={handleDismissWarning}
        />

        {/* Missed recurring task banner */}
        <MissedInstanceBanner
          missedInstances={missedInstances}
          onReschedule={handleMissedReschedule}
          onDismiss={handleMissedDismiss}
        />

        {/* Auto-reschedule confirmation toast (automatic mode) */}
        {rescheduleNotification > 0 && (
          <div className="mx-6 mb-3 px-4 py-3 rounded flex items-center gap-3 text-sm"
               style={{ background: 'var(--banner-purple-bg)', borderLeft: '4px solid var(--banner-purple-border)', color: 'var(--banner-purple-text)' }}>
            <span>✨</span>
            <span>
              {rescheduleNotification} task
              {rescheduleNotification !== 1 ? "s were" : " was"} automatically
              rescheduled to better match your updated cycle.
            </span>
            <button
              onClick={() => setRescheduleNotification(0)}
              className="ml-auto opacity-50 hover:opacity-80 text-xl leading-none"
            >
              ×
            </button>
          </div>
        )}

        {/* Pull-forward nudge — shown when review panel is closed */}
        {!showReviewPanel &&
          pullForwardSuggestions.length > 0 &&
          isOnboarded && (
            <div className="mx-6 mb-3 px-4 py-3 rounded flex items-center gap-3 text-sm"
                 style={{ background: 'var(--banner-info-bg)', borderLeft: '4px solid var(--banner-info-border)', color: 'var(--banner-info-text)' }}>
              <span>💡</span>
              <span>
                You have free slots in an upcoming high-energy week. Pull
                forward some tasks?
              </span>
              <button
                onClick={() => setShowReviewPanel(true)}
                className="ml-auto shrink-0 px-3 py-1 text-white text-xs font-medium rounded-lg transition-colors"
                style={{ background: 'var(--purple-primary)' }}
              >
                Review
              </button>
            </div>
          )}

        <div className="flex-1 flex flex-col">
          <Calendar
            key={cycles.map((c) => c.id + c.startDate).join(",")}
            currentDate={currentDate}
            cycles={cycles}
            tasks={tasks}
            onTaskClick={setSelectedTask}
            onTaskMoved={handleTaskMoved}
          />
        </div>
      </div>

      {/* Sidebars */}
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
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        preferences={userPreferences}
        onPreferencesChanged={setUserPreferences}
        onDataCleared={handleDataCleared}
        onDataImported={handleDataImported}
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

      {/* Privacy modal */}
      <PrivacyModal
        isOpen={showPrivacy}
        onClose={() => setShowPrivacy(false)}
      />

      {/* PWA install prompt */}
      <InstallPrompt />

      {/* Floating feedback button */}
      <a
        href="https://forms.gle/WPBeFiHXHktwTQTx8"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-40 text-white px-4 py-3 rounded-full flex items-center gap-2 text-sm font-medium transition-all"
        style={{
          background: 'linear-gradient(135deg, var(--purple-primary), var(--purple-dark))',
          boxShadow: '0 4px 20px var(--purple-glow)'
        }}
      >
        <span>💬</span>
        <span>Feedback</span>
      </a>

      {/* Footer */}
      <footer className="relative z-[1] px-6 py-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <div className="max-w-7xl mx-auto flex justify-between items-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
          <span>Cycle-Aware Planner — Beta</span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowPrivacy(true)}
              className="transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--purple-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
            >
              Privacy
            </button>
            <a
              href="https://forms.gle/WPBeFiHXHktwTQTx8"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--purple-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
            >
              Feedback
            </a>
          </div>
        </div>
      </footer>

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
