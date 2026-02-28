import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { saveUserPreferences } from '../../store/userPreferences'
import { exportData, importData, clearAllData } from '../../utils/storageHelpers'
import { calculateAverageCycleLength } from '../../utils/cycleHelpers'
import { sendPasswordResetEmail, deleteUser, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'
import { auth } from '../../firebase'

function CollapsibleSection({ title, defaultOpen = false, titleStyle, children }) {
    const [open, setOpen] = useState(defaultOpen)
    return (
        <div className="profile-section">
            <button
                className="profile-section-toggle"
                onClick={() => setOpen(v => !v)}
            >
                <span className="profile-section-title" style={titleStyle}>{title}</span>
                <span className={`profile-section-chevron ${open ? 'open' : ''}`}>›</span>
            </button>
            {open && <div className="profile-section-body">{children}</div>}
        </div>
    )
}

function ProfileTab({ cycles, preferences, onPreferencesChanged, onDataCleared, onDataImported, onLogPeriod, onAddTask, onOpenPrivacy, isOnboarded }) {
    const { user, logout } = useAuth()
    const { theme, updateTheme } = useTheme()
    const [clearStep, setClearStep] = useState(0)
    const [importStatus, setImportStatus] = useState(null)
    const [passwordResetStatus, setPasswordResetStatus] = useState(null)
    const [deleteStep, setDeleteStep] = useState(0)
    const [deletePassword, setDeletePassword] = useState('')
    const [deleteError, setDeleteError] = useState(null)

    if (!preferences) return null

    async function update(dotPath, value) {
        const keys = dotPath.split('.')
        const updated = JSON.parse(JSON.stringify(preferences))
        let obj = updated
        for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]]
        obj[keys[keys.length - 1]] = value
        await saveUserPreferences(updated)
        if (onPreferencesChanged) onPreferencesChanged(updated)
    }

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
        if (clearStep === 0) { setClearStep(1); return }
        setClearStep(2)
        await clearAllData()
        setClearStep(0)
        if (onDataCleared) onDataCleared()
    }

    async function handlePasswordReset() {
        if (!user?.email) return
        try {
            await sendPasswordResetEmail(auth, user.email)
            setPasswordResetStatus('success')
            setTimeout(() => setPasswordResetStatus(null), 5000)
        } catch (err) {
            console.error('Password reset failed:', err)
            setPasswordResetStatus('error')
            setTimeout(() => setPasswordResetStatus(null), 5000)
        }
    }

    async function handleDeleteAccount() {
        if (deleteStep === 0) { setDeleteStep(1); return }
        if (deleteStep === 1) {
            // Need re-authentication before deletion
            if (!deletePassword) { setDeleteError('Enter your password'); return }
            try {
                setDeleteError(null)
                const credential = EmailAuthProvider.credential(user.email, deletePassword)
                await reauthenticateWithCredential(user, credential)
                await clearAllData()
                await deleteUser(user)
            } catch (err) {
                console.error('Delete account failed:', err)
                if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                    setDeleteError('Incorrect password')
                } else {
                    setDeleteError('Failed to delete account. Try again.')
                }
            }
        }
    }

    const avgCycleLength = cycles.length >= 2 ? calculateAverageCycleLength(cycles) : null

    const notificationToggles = [
        { key: 'notifications.overloadWarnings', label: 'Overload warnings', description: 'Alert when too many tasks land in low-energy phases' },
        { key: 'notifications.pullForwardSuggestions', label: 'Pull-forward suggestions', description: 'Suggest using free slots during high-energy weeks' },
        { key: 'notifications.cycleUpdateNotifications', label: 'Cycle update alerts', description: 'Notify when a new period shifts task dates' }
    ]

    return (
        <div className="profile-tab">
            {/* User info */}
            <div className="profile-user-section">
                <div className="profile-avatar">
                    {user?.email?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="profile-email">{user?.email}</div>
            </div>

            {/* Cycle stats — always visible */}
            <div className="profile-section">
                <div className="profile-section-title">Cycle Info</div>
                <div className="profile-stat-grid">
                    <div className="profile-stat-card">
                        <span className="profile-stat-value">{cycles.length}</span>
                        <span className="profile-stat-label">Cycles Logged</span>
                    </div>
                    <div className="profile-stat-card">
                        <span className="profile-stat-value">{avgCycleLength ? `${avgCycleLength}d` : '--'}</span>
                        <span className="profile-stat-label">Avg Length</span>
                    </div>
                </div>

                <div className="profile-actions-row">
                    <button className="profile-action-btn profile-action-btn-secondary" onClick={onLogPeriod}>
                        📅 Log Period
                    </button>
                    {isOnboarded && (
                        <button className="profile-action-btn profile-action-btn-primary" onClick={onAddTask}>
                            + Add Task
                        </button>
                    )}
                </div>
            </div>

            {/* Appearance */}
            <CollapsibleSection title="Appearance" defaultOpen>
                <div className="theme-toggle">
                    <button onClick={() => updateTheme('dark')} className={`theme-toggle-btn ${theme === 'dark' ? 'active' : ''}`}>
                        🌙 Dark
                    </button>
                    <button onClick={() => updateTheme('light')} className={`theme-toggle-btn ${theme === 'light' ? 'active' : ''}`}>
                        ☀️ Light
                    </button>
                </div>
            </CollapsibleSection>

            {/* Daily Task Limit */}
            <CollapsibleSection title="Daily Task Limit">
                <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
                    Max tasks per day at your peak (ovulation). Other phases scale automatically.
                </p>
                <div className="flex items-center gap-4">
                    <input
                        type="range"
                        min={2} max={8} step={1}
                        value={preferences.dailyTaskLimit ?? 4}
                        onChange={e => update('dailyTaskLimit', Number(e.target.value))}
                        className="flex-1 accent-purple-600"
                    />
                    <span className="w-6 text-center text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {preferences.dailyTaskLimit ?? 4}
                    </span>
                </div>
            </CollapsibleSection>

            {/* Scheduling Behavior */}
            <CollapsibleSection title="Scheduling Behavior">
                <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
                    When you log a new period, how should tasks be rescheduled?
                </p>
                <div className="space-y-2">
                    {[
                        { value: 'ask_permission', label: 'Ask me first', description: 'Show suggestions — you approve each change' },
                        { value: 'automatic', label: 'Automatic', description: 'Reschedule silently and notify me afterward' }
                    ].map(opt => (
                        <label
                            key={opt.value}
                            className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors"
                            style={{
                                border: `1px solid ${preferences.reschedulingBehavior === opt.value ? 'var(--purple-primary)' : 'var(--border-subtle)'}`,
                                background: preferences.reschedulingBehavior === opt.value ? 'rgba(198,120,221,0.1)' : 'transparent'
                            }}
                        >
                            <input
                                type="radio" name="reschedule" value={opt.value}
                                checked={preferences.reschedulingBehavior === opt.value}
                                onChange={() => update('reschedulingBehavior', opt.value)}
                                className="mt-0.5 accent-purple-600 w-4 h-4"
                            />
                            <div>
                                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{opt.label}</p>
                                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{opt.description}</p>
                            </div>
                        </label>
                    ))}
                </div>
            </CollapsibleSection>

            {/* Notifications */}
            <CollapsibleSection title="Notifications">
                <div className="space-y-4">
                    {notificationToggles.map(item => {
                        const [section, key] = item.key.split('.')
                        const checked = preferences[section]?.[key] ?? true
                        return (
                            <div key={item.key} className="flex items-start gap-3">
                                <div className="flex-1">
                                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.label}</p>
                                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{item.description}</p>
                                </div>
                                <button
                                    onClick={() => update(item.key, !checked)}
                                    className="relative shrink-0 w-10 h-6 rounded-full transition-colors focus:outline-none"
                                    style={{ background: checked ? 'var(--purple-primary)' : 'var(--toggle-off)' }}
                                    role="switch" aria-checked={checked}
                                >
                                    <span className={`absolute left-0 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
                                </button>
                            </div>
                        )
                    })}
                </div>
            </CollapsibleSection>

            {/* Data Backup */}
            <CollapsibleSection title="Data Backup">
                <div className="flex gap-3">
                    <button
                        onClick={handleExport}
                        className="flex-1 px-4 py-2.5 text-white text-sm font-medium rounded-xl transition-colors"
                        style={{ background: 'linear-gradient(135deg, var(--purple-primary), var(--purple-dark))' }}
                    >
                        Export
                    </button>
                    <button
                        onClick={handleImport}
                        className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors"
                        style={{ border: '1px solid var(--purple-primary)', color: 'var(--purple-light)', background: 'transparent' }}
                    >
                        Import
                    </button>
                </div>
                {importStatus === 'success' && <p className="text-xs mt-2" style={{ color: '#4ade80' }}>Data restored successfully!</p>}
                {importStatus === 'error' && <p className="text-xs mt-2" style={{ color: '#ef4444' }}>Import failed. Check file format.</p>}
            </CollapsibleSection>

            {/* Danger Zone */}
            <CollapsibleSection title="Danger Zone" titleStyle={{ color: '#ef4444' }}>
                {clearStep === 0 && (
                    <button
                        onClick={handleClearAll}
                        className="w-full px-4 py-2.5 text-sm font-medium rounded-xl transition-colors"
                        style={{ border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', background: 'transparent' }}
                    >
                        Clear All Data
                    </button>
                )}
                {clearStep === 1 && (
                    <div className="p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                        <p className="text-sm font-medium mb-2" style={{ color: 'rgba(252,165,165,0.9)' }}>
                            Are you sure? All tasks, cycles, and settings will be deleted.
                        </p>
                        <div className="flex gap-2">
                            <button onClick={handleClearAll} className="flex-1 px-3 py-2 text-white text-sm font-medium rounded-lg" style={{ background: '#ef4444' }}>
                                Yes, Delete Everything
                            </button>
                            <button onClick={() => setClearStep(0)} className="flex-1 px-3 py-2 text-sm font-medium rounded-lg" style={{ border: '1px solid var(--border-medium)', color: 'var(--text-secondary)' }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </CollapsibleSection>

            {/* Account Management */}
            <CollapsibleSection title="Account">
                <div className="profile-account-section">
                    <button className="profile-account-btn profile-account-btn-outline" onClick={handlePasswordReset}>
                        🔑 Change Password
                    </button>
                    {passwordResetStatus === 'success' && (
                        <p className="text-xs" style={{ color: '#4ade80' }}>Password reset email sent to {user?.email}</p>
                    )}
                    {passwordResetStatus === 'error' && (
                        <p className="text-xs" style={{ color: '#ef4444' }}>Failed to send reset email. Try again.</p>
                    )}

                    {deleteStep === 0 && (
                        <button className="profile-account-btn profile-account-btn-danger" onClick={handleDeleteAccount}>
                            🗑️ Delete Account
                        </button>
                    )}
                    {deleteStep === 1 && (
                        <div className="p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                            <p className="text-sm font-medium mb-2" style={{ color: 'rgba(252,165,165,0.9)' }}>
                                This will permanently delete your account and all data. Enter your password to confirm.
                            </p>
                            <input
                                type="password"
                                placeholder="Your password"
                                value={deletePassword}
                                onChange={e => setDeletePassword(e.target.value)}
                                className="w-full px-3 py-2 mb-2 text-sm rounded-lg"
                                style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                            />
                            {deleteError && <p className="text-xs mb-2" style={{ color: '#ef4444' }}>{deleteError}</p>}
                            <div className="flex gap-2">
                                <button onClick={handleDeleteAccount} className="flex-1 px-3 py-2 text-white text-sm font-medium rounded-lg" style={{ background: '#ef4444' }}>
                                    Delete Forever
                                </button>
                                <button onClick={() => { setDeleteStep(0); setDeletePassword(''); setDeleteError(null) }} className="flex-1 px-3 py-2 text-sm font-medium rounded-lg" style={{ border: '1px solid var(--border-medium)', color: 'var(--text-secondary)' }}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </CollapsibleSection>

            {/* Privacy + Logout */}
            <div className="profile-section">
                <button onClick={onOpenPrivacy} className="profile-logout-btn" style={{ marginTop: 0, marginBottom: '8px' }}>
                    🔒 Privacy Policy
                </button>
                <button onClick={logout} className="profile-logout-btn">
                    🚪 Logout
                </button>
            </div>

            {/* Footer */}
            <div className="profile-footer">
                <p className="profile-footer-text">Cycle-Aware Planner — Beta</p>
                <a href="https://forms.gle/WPBeFiHXHktwTQTx8" target="_blank" rel="noopener noreferrer" className="profile-footer-link">
                    💬 Give Feedback
                </a>
            </div>
        </div>
    )
}

export default ProfileTab
