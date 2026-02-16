import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { logCycle, updateAllCycleLengths } from '../../utils/storageHelpers'

const STEPS = ['welcome', 'first_period', 'second_period', 'complete']

/**
 * Full-screen onboarding overlay shown until 2 cycles are logged.
 * Props:
 *   cyclesLogged  - number of cycles already in DB (so we can resume mid-flow)
 *   onComplete    - called after the final step; parent should reload cycles
 */
function OnboardingFlow({ cyclesLogged = 0, onComplete }) {
    // Resume from the right step if the user already has 1 cycle
    const initialStep = cyclesLogged === 0 ? 'welcome'
        : cyclesLogged === 1 ? 'second_period'
        : 'complete'

    const [step, setStep] = useState(initialStep)
    const [firstPeriodStart, setFirstPeriodStart] = useState(null) // remember for hint text
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const today = format(new Date(), 'yyyy-MM-dd')
    const stepIndex = STEPS.indexOf(step)

    async function saveAndAdvance(nextStep) {
        setLoading(true)
        setError('')
        try {
            await logCycle({ startDate, endDate: endDate || null })
            await updateAllCycleLengths()
            if (step === 'first_period') setFirstPeriodStart(startDate)
            setStartDate('')
            setEndDate('')
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

        // Second period must be earlier than the first
        const referenceDate = firstPeriodStart || (cyclesLogged === 1 ? null : null)
        if (referenceDate && new Date(startDate) >= new Date(referenceDate)) {
            setError(`This period should be from an earlier month than the one you already logged (${format(parseISO(referenceDate), 'MMMM')}).`)
            return
        }

        await saveAndAdvance('complete')
    }

    // Shared period log form used in both period steps
    function PeriodForm({ onSubmit }) {
        return (
            <form onSubmit={onSubmit} className="space-y-4">
                {error && (
                    <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3 rounded-lg">
                        {error}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Period Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="date"
                        required
                        value={startDate}
                        max={today}
                        onChange={e => { setStartDate(e.target.value); setError('') }}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm
                                   focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Period End Date <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                        type="date"
                        value={endDate}
                        min={startDate}
                        max={today}
                        onChange={e => setEndDate(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm
                                   focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                    />
                    <p className="text-xs text-gray-500 mt-1">Helps us calculate your cycle length accurately</p>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white
                               rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                    {loading ? 'Saving...' : 'Save & Continue →'}
                </button>
            </form>
        )
    }

    return (
        <div className="fixed inset-0 bg-gray-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">

                {/* Progress dots */}
                <div className="flex gap-2 justify-center mb-8">
                    {STEPS.map((s, i) => (
                        <div
                            key={s}
                            className={`h-2 rounded-full transition-all ${
                                i === stepIndex ? 'w-6 bg-purple-600'
                                : i < stepIndex ? 'w-2 bg-purple-300'
                                : 'w-2 bg-gray-200'
                            }`}
                        />
                    ))}
                </div>

                {/* Step: Welcome */}
                {step === 'welcome' && (
                    <div className="text-center">
                        <div className="text-5xl mb-4">🌙</div>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-3">Welcome to Luma</h2>
                        <p className="text-gray-600 mb-4 leading-relaxed">
                            This app schedules your tasks based on your energy throughout your menstrual cycle — so you work <em>with</em> your body, not against it.
                        </p>
                        <p className="text-sm text-gray-500 bg-purple-50 rounded-xl px-4 py-3 mb-8">
                            To get started, log your <strong>2 most recent periods</strong>. This lets us calculate your cycle length and phase patterns.
                        </p>
                        <button
                            onClick={() => setStep('first_period')}
                            className="w-full px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            Get Started →
                        </button>
                    </div>
                )}

                {/* Step: First period */}
                {step === 'first_period' && (
                    <div>
                        <div className="mb-6">
                            <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-1">Step 1 of 2</p>
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">Log Your Most Recent Period</h2>
                            <p className="text-sm text-gray-500">When did your last period start?</p>
                        </div>
                        <PeriodForm onSubmit={handleFirstPeriod} />
                    </div>
                )}

                {/* Step: Second period */}
                {step === 'second_period' && (
                    <div>
                        <div className="mb-6">
                            <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-1">Step 2 of 2</p>
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">Log Your Previous Period</h2>
                            <p className="text-sm text-gray-500">
                                Now log the period <strong>before</strong> that one
                                {firstPeriodStart ? ` — the one before ${format(parseISO(firstPeriodStart), 'MMMM')}` : ''}.
                                This helps us calculate your average cycle length.
                            </p>
                        </div>
                        <PeriodForm onSubmit={handleSecondPeriod} />
                    </div>
                )}

                {/* Step: Complete */}
                {step === 'complete' && (
                    <div className="text-center">
                        <div className="text-5xl mb-4">✨</div>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-3">You're All Set!</h2>
                        <p className="text-gray-600 mb-6 leading-relaxed">
                            Your cycle data is ready. Tasks will now be automatically scheduled at your best energy moments.
                        </p>
                        <div className="text-left bg-gray-50 rounded-xl p-4 mb-8 space-y-2 text-sm text-gray-700">
                            <div className="flex items-center gap-2">
                                <span className="text-base">🔴</span>
                                <span><strong>Menstrual</strong> — light, restful tasks</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-base">🟠</span>
                                <span><strong>Follicular</strong> — planning, steady progress</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-base">🟣</span>
                                <span><strong>Ovulation</strong> — high-energy, creative work</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-base">⬜</span>
                                <span><strong>Luteal</strong> — wrap up, detail work</span>
                            </div>
                        </div>
                        <button
                            onClick={onComplete}
                            className="w-full px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
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
