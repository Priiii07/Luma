/**
 * Renders stacked dismissable warning banners above the calendar.
 *
 * Severity → colour:
 *   high   → red   (overload with high-energy tasks)
 *   medium → amber (energy mismatch / overload without high-energy)
 *   low    → blue  (underutilised ovulation — info/tip style)
 *
 * Props:
 *   warnings  – array from detectOverloadSituations()
 *   onDismiss – (id: string) => void
 */
function OverloadBanner({ warnings = [], onDismiss }) {
    if (!warnings.length) return null

    const configs = {
        high: {
            bg: 'rgba(239,68,68,0.1)',
            border: 'rgba(239,68,68,0.5)',
            text: 'rgba(252,165,165,0.9)',
            icon: '⚠️'
        },
        medium: {
            bg: 'rgba(251,191,36,0.1)',
            border: 'rgba(251,191,36,0.5)',
            text: 'rgba(253,224,71,0.9)',
            icon: '⚡'
        },
        low: {
            bg: 'rgba(96,165,250,0.1)',
            border: 'rgba(96,165,250,0.4)',
            text: 'rgba(147,197,253,0.9)',
            icon: '💡'
        }
    }

    // High → medium → low display order
    const sorted = [
        ...warnings.filter(w => w.severity === 'high'),
        ...warnings.filter(w => w.severity === 'medium'),
        ...warnings.filter(w => w.severity === 'low')
    ]

    return (
        <div className="pt-1 pb-2">
            {sorted.map(w => {
                const cfg = configs[w.severity] || configs.medium
                return (
                    <div
                        key={w.id}
                        className="mx-6 mb-2 px-4 py-3 rounded flex items-start gap-3 text-sm"
                        style={{
                            background: cfg.bg,
                            borderLeft: `4px solid ${cfg.border}`,
                            color: cfg.text
                        }}
                    >
                        <span className="mt-0.5 shrink-0 text-base">{cfg.icon}</span>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium">{w.message}</p>
                            <p className="text-xs mt-0.5 opacity-75">{w.recommendation}</p>
                        </div>
                        <button
                            onClick={() => onDismiss(w.id)}
                            className="shrink-0 text-xl leading-none opacity-40 hover:opacity-80 transition-opacity"
                            aria-label="Dismiss warning"
                        >
                            ×
                        </button>
                    </div>
                )
            })}
        </div>
    )
}

export default OverloadBanner
