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
import RescheduleReviewPanel from "./components/RescheduleReviewPanel";
import SettingsPanel from "./components/Settings/SettingsPanel";
import TaskDetailModal from "./components/Task/TaskDetailModal";
import PrivacyModal from "./components/PrivacyModal";
import {
  getAllCycles,
  getAllTasks,
  updateTask,
  logTaskHistory,
} from "./utils/storageHelpers";
import { getCurrentPhaseInfo } from "./utils/cycleHelpers";
import { detectOverloadSituations } from "./utils/overloadDetector";
import { checkAndReschedule } from "./utils/reschedulingEngine";
import { suggestPullForward } from "./utils/optimizationEngine";
import { loadUserPreferences } from "./store/userPreferences";

// Import test function (remove in production)
import { testStorage } from "./utils/testStorage";

// Make test available in console
if (typeof window !== "undefined") {
  window.testStorage = testStorage;
}

function App() {
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

  const loadPreferences = async () => {
    const prefs = await loadUserPreferences();
    setUserPreferences(prefs);
  };

  // Returns the freshly loaded cycles so callers can use them synchronously
  const loadCycles = async () => {
    try {
      const allCycles = await getAllCycles();
      setCycles(allCycles);
      const phaseInfo = getCurrentPhaseInfo(allCycles);
      setCurrentPhaseInfo(phaseInfo);
      return allCycles;
    } catch (error) {
      console.error("Error loading cycles:", error);
      return [];
    }
  };

  const loadTasks = async () => {
    try {
      const allTasks = await getAllTasks();
      setTasks(allTasks);
      return allTasks;
    } catch (error) {
      console.error("Error loading tasks:", error);
      return [];
    }
  };

  /* eslint-disable react-hooks/set-state-in-effect */

  // Load everything on mount
  useEffect(() => {
    loadCycles();
    loadTasks();
    loadPreferences();
  }, []);

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

  // After a period is logged: reload data then run rescheduling check
  const handleCycleLogged = async () => {
    const newCycles = await loadCycles();
    const currentTasks = await loadTasks();

    if (newCycles.length < 2) return; // Need at least 2 cycles for meaningful reschedule

    // Load fresh preferences from DB so we never act on stale/null state
    const prefs = await loadUserPreferences();
    setUserPreferences(prefs);

    try {
      const result = await checkAndReschedule(currentTasks, newCycles, prefs);

      if (result.mode === "automatic" && result.rescheduled.length > 0) {
        await loadTasks();
        // Only show the toast if the notification toggle is on
        if (prefs.notifications.cycleUpdateNotifications) {
          setRescheduleNotification(result.rescheduled.length);
          setTimeout(() => setRescheduleNotification(0), 6000);
        }
      } else if (
        result.mode === "suggestions" &&
        result.suggestions.length > 0
      ) {
        setRescheduleSuggestions(result.suggestions);
        // showReviewPanel opens via the useEffect above
      }
    } catch (error) {
      console.error("Error running reschedule check:", error);
    }
  };

  const handleOnboardingComplete = async () => {
    await loadCycles();
    await loadPreferences();
  };

  const handleTaskCreated = () => {
    loadTasks();
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
      await loadTasks();
    } catch (error) {
      console.error("Error moving task:", error);
    }
  };

  const handleDismissWarning = (id) => {
    setDismissedWarnings((prev) => new Set([...prev, id]));
  };

  const handleReviewPanelClosed = async () => {
    setShowReviewPanel(false);
    setRescheduleSuggestions([]);
    await loadTasks();
  };

  const handleDataCleared = () => {
    setCycles([]);
    setTasks([]);
    setCurrentPhaseInfo({ phase: null, cycleDay: null });
    setWarnings([]);
    setUserPreferences(null);
    setShowSettings(false);
    loadPreferences();
  };

  const handleDataImported = async () => {
    await loadCycles();
    await loadTasks();
    await loadPreferences();
  };

  const isOnboarded = cycles.length >= 2;
  const visibleWarnings = warnings.filter((w) => !dismissedWarnings.has(w.id));

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="flex-1 bg-white flex flex-col">
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

        {/* Auto-reschedule confirmation toast (automatic mode) */}
        {rescheduleNotification > 0 && (
          <div className="mx-6 mb-3 px-4 py-3 bg-purple-50 border-l-4 border-purple-400 rounded flex items-center gap-3 text-sm text-purple-800">
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
            <div className="mx-6 mb-3 px-4 py-3 bg-blue-50 border-l-4 border-blue-300 rounded flex items-center gap-3 text-sm text-blue-800">
              <span>💡</span>
              <span>
                You have free slots in an upcoming high-energy week. Pull
                forward some tasks?
              </span>
              <button
                onClick={() => setShowReviewPanel(true)}
                className="ml-auto shrink-0 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
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
        onApplied={loadTasks}
      />

      {/* Task detail modal */}
      <TaskDetailModal
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onSaved={loadTasks}
        onDeleted={loadTasks}
      />

      {/* Privacy modal */}
      <PrivacyModal
        isOpen={showPrivacy}
        onClose={() => setShowPrivacy(false)}
      />

      {/* Floating feedback button */}
      <a
        href="https://forms.gle/WPBeFiHXHktwTQTx8"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-40 bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium transition-colors"
      >
        <span>💬</span>
        <span>Feedback</span>
      </a>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-xs text-gray-500">
          <span>Cycle-Aware Planner — Beta</span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowPrivacy(true)}
              className="hover:text-purple-600 transition-colors"
            >
              Privacy
            </button>
            <a
              href="https://forms.gle/WPBeFiHXHktwTQTx8"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-purple-600 transition-colors"
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
