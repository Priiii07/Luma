function SmartBanner({ phase }) {
    if (!phase) return null

    const phaseConfig = {
        menstrual: {
            message: "You're in a low energy phase. Keep today light and focus on essentials if possible.",
            bgColor: 'bg-pink-50',
            borderColor: 'border-pink-400',
            textColor: 'text-pink-800',
            icon: '🌙'
        },
        follicular: {
            message: "You're in a medium energy phase. Great time for steady progress and moderate tasks.",
            bgColor: 'bg-orange-50',
            borderColor: 'border-orange-400',
            textColor: 'text-orange-800',
            icon: '🌱'
        },
        ovulation: {
            message: "You're in a high energy phase! Consider pulling forward some medium tasks from next week.",
            bgColor: 'bg-purple-50',
            borderColor: 'border-purple-400',
            textColor: 'text-purple-800',
            icon: '⚡'
        },
        luteal: {
            message: "You're in a prep phase. Consider finishing open tasks and preparing for a lighter week ahead.",
            bgColor: 'bg-gray-50',
            borderColor: 'border-gray-400',
            textColor: 'text-gray-800',
            icon: '🔄'
        }
    }

    const config = phaseConfig[phase] || phaseConfig.luteal

    return (
        <div className={`mx-6 my-4 px-4 py-3 ${config.bgColor} border-l-4 ${config.borderColor} rounded flex items-center gap-3 text-sm ${config.textColor}`}>
            <span>{config.icon}</span>
            <span>{config.message}</span>
        </div>
    )
}

export default SmartBanner
