import { useState } from 'react'
import { useTheme } from '../../contexts/ThemeContext'

function ThemeSelector({ onSelect }) {
    const { theme, updateTheme } = useTheme()
    const [selected, setSelected] = useState(theme)

    const handleSelect = (t) => {
        setSelected(t)
        updateTheme(t) // Apply immediately for live preview
    }

    return (
        <div className="text-center">
            <div className="text-5xl mb-4">🎨</div>
            <h2 className="text-2xl font-serif italic mb-3" style={{ color: 'var(--text-primary)' }}>
                Choose Your Theme
            </h2>
            <p className="mb-6 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Pick the look that feels right for you. You can change this anytime in Settings.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-8">
                {/* Dark Theme Card */}
                <button
                    onClick={() => handleSelect('dark')}
                    className="relative rounded-xl p-4 text-left transition-all"
                    style={{
                        border: `2px solid ${selected === 'dark' ? 'var(--purple-primary)' : 'var(--border-subtle)'}`,
                        background: selected === 'dark' ? 'rgba(198,120,221,0.08)' : 'transparent'
                    }}
                >
                    {/* Mini preview */}
                    <div className="theme-preview dark-preview mb-3">
                        <div className="preview-header">
                            <div className="preview-dots">
                                <span /><span /><span />
                            </div>
                        </div>
                        <div className="preview-content">
                            <div className="preview-calendar">
                                <div className="preview-day menstrual" />
                                <div className="preview-day follicular" />
                                <div className="preview-day ovulation" />
                                <div className="preview-day luteal" />
                            </div>
                            <div className="preview-orb" />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">🌙</span>
                        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Dark</span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        Sophisticated with glowing accents
                    </p>

                    {selected === 'dark' && (
                        <div className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                             style={{ background: 'var(--purple-primary)' }}>
                            ✓
                        </div>
                    )}
                </button>

                {/* Light Theme Card */}
                <button
                    onClick={() => handleSelect('light')}
                    className="relative rounded-xl p-4 text-left transition-all"
                    style={{
                        border: `2px solid ${selected === 'light' ? 'var(--purple-primary)' : 'var(--border-subtle)'}`,
                        background: selected === 'light' ? 'rgba(198,120,221,0.08)' : 'transparent'
                    }}
                >
                    {/* Mini preview */}
                    <div className="theme-preview light-preview mb-3">
                        <div className="preview-header">
                            <div className="preview-dots">
                                <span /><span /><span />
                            </div>
                        </div>
                        <div className="preview-content">
                            <div className="preview-calendar">
                                <div className="preview-day menstrual" />
                                <div className="preview-day follicular" />
                                <div className="preview-day ovulation" />
                                <div className="preview-day luteal" />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">☀️</span>
                        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Light</span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        Clean white with vibrant colors
                    </p>

                    {selected === 'light' && (
                        <div className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                             style={{ background: 'var(--purple-primary)' }}>
                            ✓
                        </div>
                    )}
                </button>
            </div>

            <button
                onClick={() => onSelect(selected)}
                className="w-full px-5 py-2.5 text-white rounded-lg text-sm font-medium transition-colors"
                style={{
                    background: 'linear-gradient(135deg, var(--purple-primary), var(--purple-dark))',
                    boxShadow: '0 2px 12px var(--purple-glow)'
                }}
            >
                Continue →
            </button>
        </div>
    )
}

export default ThemeSelector
