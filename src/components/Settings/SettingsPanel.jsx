import { useState } from 'react'
import { saveUserPreferences } from '../../store/userPreferences'
import { exportData, importData, clearAllData } from '../../utils/storageHelpers'

/**
 * Slide-in settings sidebar.
 *
 * Props:
 *   isOpen               – boolean
 *   onClose              – () => void
 *   preferences          – current preferences object
 *   onPreferencesChanged – (updated: Object) => void
 *   onDataCleared        – () => void   (callback after clearing all data)
 *   onDataImported       – () => void   (callback after importing data)
 */
function SettingsPanel({ isOpen, onClose, preferences, onPreferencesChanged, onDataCleared, onDataImported }) {
    const [clearStep, setClearStep] = useState(0) // 0=idle, 1=first confirm, 2=clearing
    const [importStatus, setImportStatus] = useState(null) // null | 'success' | 'error'

    if (!preferences) return null

    async function handleExport() {
        try {
            const data = await exportData()
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `cycle-planner-backup-${new Date().toISOString().slice(0, 10)}.json`
            a.click()
            URL.revokeObjectURL(url)
        } catch (err) {
            console.error('Export failed:', err)
        }
    }

    function handleImport() {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.json'
        input.onchange = async (e) => {
            const file = e.target.files[0]
            if (!file) return
            try {
                const text = await file.text()
                const data = JSON.parse(text)
                await clearAllData()
                await importData(data)
                setImportStatus('success')
                if (onDataImported) onDataImported()
                setTimeout(() => setImportStatus(null), 3000)
            } catch (err) {
                console.error('Import failed:', err)
                setImportStatus('error')
                setTimeout(() => setImportStatus(null), 3000)
            }
        }
        input.click()
    }

    async function handleClearAll() {
        if (clearStep === 0) {
            setClearStep(1)
            return
        }
        setClearStep(2)
        await clearAllData()
        setClearStep(0)
        if (onDataCleared) onDataCleared()
    }

    async function update(dotPath, value) {
        const keys = dotPath.split('.')
        // Deep-clone so we don't mutate state
        const updated = JSON.parse(JSON.stringify(preferences))
        let obj = updated
        for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]]
        obj[keys[keys.length - 1]] = value
        await saveUserPreferences(updated)
        if (onPreferencesChanged) onPreferencesChanged(updated)
    }

    const notificationToggles = [
        {
            key: 'notifications.overloadWarnings',
            label: 'Overload warnings',
            description: 'Alert when too many tasks land in low-energy phases'
        },
        {
            key: 'notifications.pullForwardSuggestions',
            label: 'Pull-forward suggestions',
            description: 'Suggest using free slots during high-energy weeks'
        },
        {
            key: 'notifications.cycleUpdateNotifications',
            label: 'Cycle update alerts',
            description: 'Notify when a new period shifts task dates'
        }
    ]

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 bg-black/20 z-40" onMouseDown={onClose} />
            )}

            <div className={`
                fixed right-0 top-0 w-96 h-screen bg-white shadow-2xl z-50
                transition-transform duration-300 overflow-y-auto
                ${isOpen ? 'translate-x-0' : 'translate-x-full'}
            `}>
                <div className="px-6 py-6 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-800">Settings</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                    >
                        ×
                    </button>
                </div>

                <div className="px-6 py-6 space-y-8">

                    {/* ── Daily Task Limit ── */}
                    <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                            Daily Task Limit
                        </h4>
                        <p className="text-xs text-gray-400 mb-3">
                            Max tasks per day at your peak (ovulation). Other phases scale automatically.
                        </p>
                        <div className="flex items-center gap-4">
                            <input
                                type="range"
                                min={2}
                                max={8}
                                step={1}
                                value={preferences.dailyTaskLimit ?? 4}
                                onChange={e => update('dailyTaskLimit', Number(e.target.value))}
                                className="flex-1 accent-purple-600"
                            />
                            <span className="w-6 text-center text-sm font-semibold text-gray-800">
                                {preferences.dailyTaskLimit ?? 4}
                            </span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>Lighter</span>
                            <span>Heavier</span>
                        </div>
                    </div>

                    {/* ── Rescheduling Behavior ── */}
                    <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                            Scheduling Behavior
                        </h4>
                        <p className="text-xs text-gray-400 mb-4">
                            When you log a new period and cycle phases shift, how should tasks be rescheduled?
                        </p>
                        <div className="space-y-3">
                            {[
                                {
                                    value: 'ask_permission',
                                    label: 'Ask me first',
                                    description: 'Show suggestions — you approve each change'
                                },
                                {
                                    value: 'automatic',
                                    label: 'Automatic',
                                    description: 'Reschedule silently and notify me afterward'
                                }
                            ].map(opt => (
                                <label
                                    key={opt.value}
                                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                                        preferences.reschedulingBehavior === opt.value
                                            ? 'border-purple-400 bg-purple-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="reschedule"
                                        value={opt.value}
                                        checked={preferences.reschedulingBehavior === opt.value}
                                        onChange={() => update('reschedulingBehavior', opt.value)}
                                        className="mt-0.5 accent-purple-600 w-4 h-4"
                                    />
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">{opt.label}</p>
                                        <p className="text-xs text-gray-500">{opt.description}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* ── Notifications ── */}
                    <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                            Notifications
                        </h4>
                        <div className="space-y-4">
                            {notificationToggles.map(item => {
                                const [section, key] = item.key.split('.')
                                const checked = preferences[section]?.[key] ?? true
                                return (
                                    <div key={item.key} className="flex items-start gap-3">
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-800">{item.label}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                                        </div>
                                        <button
                                            onClick={() => update(item.key, !checked)}
                                            className={`relative shrink-0 w-10 h-6 rounded-full transition-colors focus:outline-none ${
                                                checked ? 'bg-purple-600' : 'bg-gray-300'
                                            }`}
                                            role="switch"
                                            aria-checked={checked}
                                        >
                                            <span className={`absolute left-0 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                                checked ? 'translate-x-[22px]' : 'translate-x-[2px]'
                                            }`} />
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* ── Data Backup ── */}
                    <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                            Data Backup
                        </h4>
                        <p className="text-xs text-gray-400 mb-3">
                            Export your data as a JSON file or restore from a previous backup.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleExport}
                                className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition-colors"
                            >
                                Export Backup
                            </button>
                            <button
                                onClick={handleImport}
                                className="flex-1 px-4 py-2.5 border border-purple-300 text-purple-700 hover:bg-purple-50 text-sm font-medium rounded-xl transition-colors"
                            >
                                Import Backup
                            </button>
                        </div>
                        {importStatus === 'success' && (
                            <p className="text-xs text-green-600 mt-2">Data restored successfully!</p>
                        )}
                        {importStatus === 'error' && (
                            <p className="text-xs text-red-600 mt-2">Import failed. Please check the file format.</p>
                        )}
                    </div>

                    {/* ── Clear All Data ── */}
                    <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                            Danger Zone
                        </h4>
                        <p className="text-xs text-gray-400 mb-3">
                            Permanently delete all your data. This cannot be undone.
                        </p>
                        {clearStep === 0 && (
                            <button
                                onClick={handleClearAll}
                                className="w-full px-4 py-2.5 border border-red-300 text-red-600 hover:bg-red-50 text-sm font-medium rounded-xl transition-colors"
                            >
                                Clear All Data
                            </button>
                        )}
                        {clearStep === 1 && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                                <p className="text-sm text-red-700 font-medium mb-2">
                                    Are you sure? All tasks, cycles, and settings will be deleted.
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleClearAll}
                                        className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                                    >
                                        Yes, Delete Everything
                                    </button>
                                    <button
                                        onClick={() => setClearStep(0)}
                                        className="flex-1 px-3 py-2 border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                        {clearStep === 2 && (
                            <p className="text-sm text-gray-500">Clearing data...</p>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}

export default SettingsPanel
