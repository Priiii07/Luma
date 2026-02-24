import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

function LoginPage() {
    const { login, signup } = useAuth()
    const [isSignUp, setIsSignUp] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const errorMessages = {
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/user-disabled': 'This account has been disabled.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/email-already-in-use': 'An account with this email already exists.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.'
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')

        if (!email.trim() || !password) {
            setError('Please fill in all fields.')
            return
        }

        if (isSignUp && password !== confirmPassword) {
            setError('Passwords do not match.')
            return
        }

        setLoading(true)
        try {
            if (isSignUp) {
                await signup(email.trim(), password)
            } else {
                await login(email.trim(), password)
            }
        } catch (err) {
            setError(errorMessages[err.code] || 'Something went wrong. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    function switchMode() {
        setIsSignUp(!isSignUp)
        setError('')
        setConfirmPassword('')
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4"
             style={{ background: 'var(--bg-primary)' }}>

            {/* Ambient background */}
            <div className="ember-bg">
                <div className="ember-orb-1" />
                <div className="ember-orb-2" />
            </div>

            <div className="w-full max-w-sm relative z-10">
                {/* Logo */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-serif italic mb-2" style={{ color: 'var(--text-primary)' }}>
                        🌸 Cycle-Aware Planner
                    </h1>
                    <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                        Plan with your cycle, not against it
                    </p>
                </div>

                {/* Form card */}
                <div className="rounded-2xl p-6 space-y-5"
                     style={{
                         background: 'var(--bg-secondary)',
                         border: '1px solid var(--border-subtle)',
                         boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
                     }}>

                    <h2 className="text-lg font-semibold text-center" style={{ color: 'var(--text-primary)' }}>
                        {isSignUp ? 'Create Account' : 'Welcome Back'}
                    </h2>

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

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wide mb-1"
                                   style={{ color: 'var(--purple-primary)' }}>
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none"
                                style={{
                                    background: 'var(--surface-2)',
                                    border: '1px solid var(--border-medium)',
                                    color: 'var(--text-primary)'
                                }}
                                placeholder="you@example.com"
                                autoComplete="email"
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wide mb-1"
                                   style={{ color: 'var(--purple-primary)' }}>
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none"
                                style={{
                                    background: 'var(--surface-2)',
                                    border: '1px solid var(--border-medium)',
                                    color: 'var(--text-primary)'
                                }}
                                placeholder="Enter password"
                                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                            />
                        </div>

                        {isSignUp && (
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wide mb-1"
                                       style={{ color: 'var(--purple-primary)' }}>
                                    Confirm Password
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none"
                                    style={{
                                        background: 'var(--surface-2)',
                                        border: '1px solid var(--border-medium)',
                                        color: 'var(--text-primary)'
                                    }}
                                    placeholder="Re-enter password"
                                    autoComplete="new-password"
                                />
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-all"
                            style={{
                                background: 'linear-gradient(135deg, var(--purple-primary), var(--purple-dark))',
                                boxShadow: '0 4px 12px var(--purple-glow)'
                            }}
                        >
                            {loading
                                ? (isSignUp ? 'Creating account...' : 'Signing in...')
                                : (isSignUp ? 'Create Account' : 'Sign In')
                            }
                        </button>
                    </form>

                    <div className="text-center">
                        <button
                            onClick={switchMode}
                            className="text-xs transition-colors"
                            style={{ color: 'var(--text-tertiary)' }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--purple-primary)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                        >
                            {isSignUp
                                ? 'Already have an account? Sign in'
                                : "Don't have an account? Sign up"
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default LoginPage
