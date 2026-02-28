import { format, addDays } from 'date-fns'

export default function QuickStats({ tasks }) {
    const today = format(new Date(), 'yyyy-MM-dd')

    const todayTasks = tasks.filter(t => t.scheduledDate === today)
    const completedToday = todayTasks.filter(t => t.completed).length
    const pendingToday = todayTasks.filter(t => !t.completed).length

    // Tasks this week (next 7 days)
    const weekDates = Array.from({ length: 7 }, (_, i) =>
        format(addDays(new Date(), i), 'yyyy-MM-dd')
    )
    const weekTasks = tasks.filter(t => weekDates.includes(t.scheduledDate) && !t.completed)

    // Overdue tasks
    const overdue = tasks.filter(t =>
        t.scheduledDate < today && !t.completed
    )

    const stats = [
        { label: 'Today', value: pendingToday, sub: `${completedToday} done`, color: 'var(--purple-primary)' },
        { label: 'This Week', value: weekTasks.length, sub: 'pending', color: 'var(--terracotta)' },
        { label: 'Overdue', value: overdue.length, sub: overdue.length > 0 ? 'need attention' : 'all clear', color: overdue.length > 0 ? '#ef4444' : '#4ade80' }
    ]

    return (
        <div className="quick-stats">
            {stats.map(stat => (
                <div key={stat.label} className="quick-stat-item">
                    <div className="quick-stat-value" style={{ color: stat.color }}>
                        {stat.value}
                    </div>
                    <div className="quick-stat-label">{stat.label}</div>
                    <div className="quick-stat-sub">{stat.sub}</div>
                </div>
            ))}
        </div>
    )
}
