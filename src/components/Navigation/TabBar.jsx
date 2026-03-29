import { Home, CalendarDays, Archive, CheckSquare, User } from 'lucide-react'

function TabBar({ activeTab, onTabChange }) {
    const tabs = [
        { id: 'home', icon: Home, label: 'Home' },
        { id: 'calendar', icon: CalendarDays, label: 'Calendar' },
        { id: 'backlog', icon: Archive, label: 'Later' },
        { id: 'tasks', icon: CheckSquare, label: 'Tasks' },
        { id: 'profile', icon: User, label: 'Profile' }
    ]

    return (
        <nav className="tab-bar">
            {tabs.map(tab => {
                const Icon = tab.icon
                return (
                    <button
                        key={tab.id}
                        className={`tab-bar-item ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => onTabChange(tab.id)}
                    >
                        <span className="tab-bar-icon">
                            <Icon size={20} strokeWidth={activeTab === tab.id ? 2 : 1.5} />
                        </span>
                        <span className="tab-bar-label">{tab.label}</span>
                    </button>
                )
            })}
        </nav>
    )
}

export default TabBar
