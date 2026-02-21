import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import DatePicker from 'react-datepicker'
import { logCycle, updateAllCycleLengths } from '../../utils/storageHelpers'
import { loadUserPreferences, saveUserPreferences } from '../../store/userPreferences'

const STEPS = ['welcome', 'first_period', 'second_period', 'daily_limit', 'complete']

function OnboardingFlow({ cyclesLogged = 0, onComplete }) {
    const initialStep = cyclesLogged === 0 ? 'welcome'
        : cyclesLogged === 1 ? 'second_period'
        : 'complete'

    const [step, setStep] = useState(initialStep)
    const [firstPeriodStart, setFirstPeriodStart] = useState(null)
    const [startDate, setStartDate] = useState(null)
    const [endDate, setEndDate] = useState(null)
    const [dailyLimit, setDailyLimit] = useState(4)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const today = new Date()
    const stepIndex = STEPS.indexOf(step)

    const startDateStr = startDate ? format(startDate, 'yyyy-MM-dd') : ''
    const endDateStr = endDate ? format(endDate, 'yyyy-MM-dd') : null

    async function saveAndAdvance(nextStep) {
        setLoading(true)
        setError('')
        try {
            await logCycle({ startDate: startDateStr, endDate: endDateStr })
            await updateAllCycleLengths()
            if (step === 'first_period') setFirstPeriodStart(startDateStr)
            setStartDate(null)
            setEndDate(null)
            setStep(nextStep)
        } catch {
            setError('Something went wrong saving your period. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    async function handleFirstPeriod(e) {
        e.preventDefault()
        await saveAndAdvance('second_period')
    }

    async function handleSecondPeriod(e) {
        e.preventDefault()

        const referenceDate = firstPeriodStart || (cyclesLogged === 1 ? null : null)
        if (referenceDate && startDate >= new Date(referenceDate)) {
            setError(`This period should be from an earlier month than the one you already logged (${format(parseISO(referenceDate), 'MMMM')}).`)
            return
        }

        await saveAndAdvance('daily_limit')
    }

    async function handleDailyLimitSave() {
        setLoading(true)
        try {
            const prefs = await loadUserPreferences()
            await saveUserPreferences({ ...prefs, dailyTaskLimit: dailyLimit })
            setStep('complete')
        } catch {
            setError('Could not save your preference. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    function PeriodForm({ onSubmit }) {
        return (
            <form onSubmit={onSubmit} className="space-y-4">
                {error && (
                    <div className="text-sm px-4 py-3 rounded-lg"
                         style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'rgba(252,165,165,0.9)' }}>
                        {error}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                        Period Start Date <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <DatePicker
                        selected={startDate}
                        onChange={(date) => { setStartDate(date); setError('') }}
                        dateFormat="MMM d, yyyy"
                        maxDate={today}
                        className="w-full px-3 py-2.5 rounded-md text-sm focus:outline-none"
                        placeholderText="Select start date"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                        Period End Date <span className="font-normal" style={{ color: 'var(--text-tertiary)' }}>(optional)</span>
                    </label>
                    <DatePicker
                        selected={endDate}
                        onChange={(date) => setEndDate(date)}
                        dateFormat="MMM d, yyyy"
                        minDate={startDate}
                        maxDate={today}
                        className="w-full px-3 py-2.5 rounded-md text-sm focus:outline-none"
                        placeholderText="Select end date"
                        isClearable
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Helps us calculate your cycle length accurately</p>
                </div>

                <button
                    type="submit"
                    disabled={loading || !startDate}
                    className="w-full px-5 py-2.5 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, var(--purple-primary), var(--purple-dark))' }}
                >
                    {loading ? 'Saving...' : 'Save & Continue →'}
                </button>
            </form>
        )
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'var(--bg-primary)' }}>
            {/* Ambient orbs behind onboarding card */}
            <div className="ember-bg">
                <div className="ember-orb-1" />
                <div className="ember-orb-2" />
            </div>

            <div className="rounded-2xl shadow-2xl w-full max-w-md p-8 relative z-10"
                 style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>

                {/* Progress dots */}
                <div className="flex gap-2 justify-center mb-8">
                    {STEPS.map((s, i) => (
                        <div
                            key={s}
                            className="h-2 rounded-full transition-all"
                            style={{
                                width: i === stepIndex ? '24px' : '8px',
                                background: i === stepIndex ? 'var(--purple-primary)'
                                    : i < stepIndex ? 'var(--purple-dark)'
                                    : 'rgba(255,255,255,0.1)'
                            }}
                        />
                    ))}
                </div>

                {/* Step: Welcome */}
                {step === 'welcome' && (
                    <div className="text-center">
                        <div className="text-5xl mb-4">🌙</div>
                        <h2 className="text-2xl font-serif italic mb-3" style={{ color: 'var(--text-primary)' }}>Welcome to Luma</h2>
                        <p className="mb-4 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                            This app schedules your tasks based on your energy throughout your menstrual cycle — so you work <em>with</em> your body, not against it.
                        </p>
                        <p className="text-sm rounded-xl px-4 py-3 mb-8"
                           style={{ background: 'rgba(198,120,221,0.1)', color: 'var(--purple-light)', border: '1px solid rgba(198,120,221,0.2)' }}>
                            To get started, log your <strong>2 most recent periods</strong>. This lets us calculate your cycle length and phase patterns.
                        </p>
                        <button
                            onClick={() => setStep('first_period')}
                            className="w-full px-5 py-2.5 text-white rounded-lg text-sm font-medium transition-colors"
                            style={{ background: 'linear-gradient(135deg, var(--purple-primary), var(--purple-dark))', boxShadow: '0 2px 12px var(--purple-glow)' }}
                        >
                            Get Started →
                        </button>
                    </div>
                )}

                {/* Step: First period */}
                {step === 'first_period' && (
                    <div>
                        <div className="mb-6">
                            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--purple-primary)' }}>Step 1 of 2</p>
                            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Log Your Most Recent Period</h2>
                            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>When did your last period start?</p>
                        </div>
                        <PeriodForm onSubmit={handleFirstPeriod} />
                    </div>
                )}

                {/* Step: Second period */}
                {step === 'second_period' && (
                    <div>
                        <div className="mb-6">
                            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--purple-primary)' }}>Step 2 of 2</p>
                            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Log Your Previous Period</h2>
                            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                                Now log the period <strong>before</strong> that one
                                {firstPeriodStart ? ` — the one before ${format(parseISO(firstPeriodStart), 'MMMM')}` : ''}.
                                This helps us calculate your average cycle length.
                            </p>
                        </div>
                        <PeriodForm onSubmit={handleSecondPeriod} />
                    </div>
                )}

                {/* Step: Daily limit */}
                {step === 'daily_limit' && (
                    <div>
                        <div className="mb-6">
                            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--purple-primary)' }}>Almost done</p>
                            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>How many tasks can you handle per day?</h2>
                            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                                We'll use this to avoid overloading your schedule. You can always change it later in Settings.
                            </p>
                        </div>

                        {error && (
                            <div className="text-sm px-4 py-3 rounded-lg mb-4"
                                 style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'rgba(252,165,165,0.9)' }}>
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-5 gap-2 mb-6">
                            {[2, 3, 4, 5, 6].map(n => (
                                <button
                                    key={n}
                                    type="button"
                                    onClick={() => setDailyLimit(n)}
                                    className="flex flex-col items-center py-3 rounded-xl border-2 transition-all"
                                    style={{
                                        borderColor: dailyLimit === n ? 'var(--purple-primary)' : 'var(--border-subtle)',
                                        background: dailyLimit === n ? 'rgba(198,120,221,0.1)' : 'transparent',
                                        color: dailyLimit === n ? 'var(--purple-light)' : 'var(--text-secondary)'
                                    }}
                                >
                                    <span className="text-lg font-bold">{n}</span>
                                    <span className="text-[10px] mt-0.5">
                                        {n === 2 ? 'Light' : n === 3 ? 'Easy' : n === 4 ? 'Moderate' : n === 5 ? 'Busy' : 'Heavy'}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <p className="text-xs text-center mb-6" style={{ color: 'var(--text-tertiary)' }}>
                            This is your peak-day limit. Rest phases will automatically scale down.
                        </p>

                        <button
                            onClick={handleDailyLimitSave}
                            disabled={loading}
                            className="w-full px-5 py-2.5 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            style={{ background: 'linear-gradient(135deg, var(--purple-primary), var(--purple-dark))' }}
                        >
                            {loading ? 'Saving...' : 'Save & Continue →'}
                        </button>
                    </div>
                )}

                {/* Step: Complete */}
                {step === 'complete' && (
                    <div className="text-center">
                        <div className="text-5xl mb-4">✨</div>
                        <h2 className="text-2xl font-serif italic mb-3" style={{ color: 'var(--text-primary)' }}>You're All Set!</h2>
                        <p className="mb-6 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                            Your cycle data is ready. Tasks will now be automatically scheduled at your best energy moments.
                        </p>
                        <div className="text-left rounded-xl p-4 mb-8 space-y-2 text-sm"
                             style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                            <div className="flex items-center gap-2">
                                <span className="text-base">🔴</span>
                                <span><strong style={{ color: 'var(--text-primary)' }}>Menstrual</strong> — light, restful tasks</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-base">🟠</span>
                                <span><strong style={{ color: 'var(--text-primary)' }}>Follicular</strong> — planning, steady progress</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-base">🟣</span>
                                <span><strong style={{ color: 'var(--text-primary)' }}>Ovulation</strong> — high-energy, creative work</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-base">⬜</span>
                                <span><strong style={{ color: 'var(--text-primary)' }}>Luteal</strong> — wrap up, detail work</span>
                            </div>
                        </div>
                        <button
                            onClick={onComplete}
                            className="w-full px-5 py-2.5 text-white rounded-lg text-sm font-medium transition-colors"
                            style={{ background: 'linear-gradient(135deg, var(--purple-primary), var(--purple-dark))', boxShadow: '0 2px 12px var(--purple-glow)' }}
                        >
                            Start Adding Tasks
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default OnboardingFlow
