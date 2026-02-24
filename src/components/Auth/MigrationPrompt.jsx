import { useState } from 'react'
import { migrateToFirestore, deleteLocalDatabase } from '../../utils/migrationTool'

function MigrationPrompt({ userId, onComplete }) {
    const [migrating, setMigrating] = useState(false)
    const [progress, setProgress] = useState({ completed: 0, total: 0 })
    const [result, setResult] = useState(null)
    const [error, setError] = useState(null)

    async function handleMigrate() {
        setMigrating(true)
        setError(null)
        try {
            const counts = await migrateToFirestore(userId, (completed, total) => {
                setProgress({ completed, total })
            })
            setResult(counts)
            await deleteLocalDatabase()
            setTimeout(() => onComplete(), 2000)
        } catch (err) {
            console.error('Migration failed:', err)
            setError('Migration failed. Your local data is still safe. Please try again.')
            setMigrating(false)
        }
    }

    async function handleStartFresh() {
        try {
            await deleteLocalDatabase()
        } catch {
            // OK if it doesn't exist
        }
        onComplete()
    }

    const totalMigrated = result
        ? result.tasks + result.cycles + result.recurringDefinitions
        : 0

    return (
        <>
            <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
                <div className="rounded-2xl shadow-2xl w-full max-w-sm pointer-events-auto p-6 space-y-5"
                     style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>

                    <div className="text-center">
                        <div className="text-3xl mb-3">📦</div>
                        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                            Existing Data Found
                        </h2>
                        <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                            You have data stored locally from before. Would you like to migrate it to your account?
                        </p>
                    </div>

                    {error && (
                        <div className="px-3 py-2 rounded-lg text-xs"
                             style={{
                                 background: 'var(--banner-error-bg)',
                                 border: '1px solid var(--banner-error-border)',
                                 color: 'var(--banner-error-text)'
                             }}>
                            {error}
                        </div>
                    )}

                    {migrating && !result && (
                        <div className="space-y-2">
                            <div className="w-full rounded-full h-2 overflow-hidden"
                                 style={{ background: 'var(--surface-2)' }}>
                                <div className="h-full rounded-full transition-all duration-300"
                                     style={{
                                         background: 'linear-gradient(135deg, var(--purple-primary), var(--purple-dark))',
                                         width: progress.total > 0 ? `${(progress.completed / progress.total) * 100}%` : '0%'
                                     }}
                                />
                            </div>
                            <p className="text-xs text-center" style={{ color: 'var(--text-tertiary)' }}>
                                Migrating... {progress.completed} / {progress.total}
                            </p>
                        </div>
                    )}

                    {result && (
                        <div className="text-center space-y-1">
                            <div className="text-2xl">✅</div>
                            <p className="text-sm font-medium" style={{ color: '#4ade80' }}>
                                Data migrated successfully!
                            </p>
                            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                                {totalMigrated} items moved to your account
                            </p>
                        </div>
                    )}

                    {!migrating && !result && (
                        <div className="space-y-2">
                            <button
                                onClick={handleMigrate}
                                className="w-full py-2.5 text-white text-sm font-medium rounded-xl transition-all"
                                style={{
                                    background: 'linear-gradient(135deg, var(--purple-primary), var(--purple-dark))',
                                    boxShadow: '0 4px 12px var(--purple-glow)'
                                }}
                            >
                                Migrate My Data
                            </button>
                            <button
                                onClick={handleStartFresh}
                                className="w-full py-2.5 text-sm font-medium rounded-xl transition-colors"
                                style={{
                                    background: 'var(--surface-2)',
                                    color: 'var(--text-secondary)',
                                    border: '1px solid var(--border-subtle)'
                                }}
                            >
                                Start Fresh
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}

export default MigrationPrompt
