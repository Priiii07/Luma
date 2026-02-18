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
            bg: 'bg-red-50',
            border: 'border-red-400',
            text: 'text-red-800',
            icon: '⚠️'
        },
        medium: {
            bg: 'bg-amber-50',
            border: 'border-amber-400',
            text: 'text-amber-800',
            icon: '⚡'
        },
        low: {
            bg: 'bg-blue-50',
            border: 'border-blue-300',
            text: 'text-blue-800',
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
                        className={`mx-6 mb-2 px-4 py-3 ${cfg.bg} border-l-4 ${cfg.border} rounded flex items-start gap-3 text-sm ${cfg.text}`}
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
