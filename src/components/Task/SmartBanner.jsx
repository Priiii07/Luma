function SmartBanner({ phase }) {
    if (!phase) return null

    const phaseConfig = {
        menstrual: {
            message: "You're in a low energy phase. Keep today light and focus on essentials if possible.",
            bg: 'var(--banner-menstrual-bg)',
            border: 'var(--banner-menstrual-border)',
            text: 'var(--banner-menstrual-text)',
            icon: '🌙'
        },
        follicular: {
            message: "You're in a medium energy phase. Great time for steady progress and moderate tasks.",
            bg: 'var(--banner-follicular-bg)',
            border: 'var(--banner-follicular-border)',
            text: 'var(--banner-follicular-text)',
            icon: '🌱'
        },
        ovulation: {
            message: "You're in a high energy phase! Consider pulling forward some medium tasks from next week.",
            bg: 'var(--banner-ovulation-bg)',
            border: 'var(--banner-ovulation-border)',
            text: 'var(--banner-ovulation-text)',
            icon: '⚡'
        },
        luteal: {
            message: "You're in a prep phase. Consider finishing open tasks and preparing for a lighter week ahead.",
            bg: 'var(--banner-luteal-bg)',
            border: 'var(--banner-luteal-border)',
            text: 'var(--banner-luteal-text)',
            icon: '🔄'
        }
    }

    const config = phaseConfig[phase] || phaseConfig.luteal

    return (
        <div
            className="mx-2 md:mx-6 my-2 md:my-4 px-3 md:px-4 py-2 md:py-3 rounded flex items-center gap-2 md:gap-3 text-xs md:text-sm"
            style={{
                background: config.bg,
                borderLeft: `4px solid ${config.border}`,
                color: config.text
            }}
        >
            <span>{config.icon}</span>
            <span>{config.message}</span>
        </div>
    )
}

export default SmartBanner
