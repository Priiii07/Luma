function SmartBanner({ phase }) {
    if (!phase) return null

    const phaseConfig = {
        menstrual: {
            message: "You're in a low energy phase. Keep today light and focus on essentials if possible.",
            bg: 'rgba(200,60,80,0.1)',
            border: 'rgba(200,60,80,0.5)',
            text: 'rgba(255,150,160,0.9)',
            icon: '🌙'
        },
        follicular: {
            message: "You're in a medium energy phase. Great time for steady progress and moderate tasks.",
            bg: 'rgba(210,140,40,0.1)',
            border: 'rgba(210,140,40,0.5)',
            text: 'rgba(255,200,100,0.9)',
            icon: '🌱'
        },
        ovulation: {
            message: "You're in a high energy phase! Consider pulling forward some medium tasks from next week.",
            bg: 'rgba(160,70,220,0.1)',
            border: 'rgba(160,70,220,0.5)',
            text: 'rgba(208,136,237,0.9)',
            icon: '⚡'
        },
        luteal: {
            message: "You're in a prep phase. Consider finishing open tasks and preparing for a lighter week ahead.",
            bg: 'rgba(100,100,130,0.1)',
            border: 'rgba(100,100,130,0.5)',
            text: 'rgba(180,180,200,0.9)',
            icon: '🔄'
        }
    }

    const config = phaseConfig[phase] || phaseConfig.luteal

    return (
        <div
            className="mx-6 my-4 px-4 py-3 rounded flex items-center gap-3 text-sm"
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
