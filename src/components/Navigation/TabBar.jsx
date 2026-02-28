function TabBar({ activeTab, onTabChange }) {
    const tabs = [
        { id: 'home', icon: '🏠', label: 'Home' },
        { id: 'calendar', icon: '📅', label: 'Calendar' },
        { id: 'tasks', icon: '📋', label: 'Tasks' },
        { id: 'profile', icon: '👤', label: 'Profile' }
    ]

    return (
        <nav className="tab-bar">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    className={`tab-bar-item ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => onTabChange(tab.id)}
                >
                    <span className="tab-bar-icon">{tab.icon}</span>
                    <span className="tab-bar-label">{tab.label}</span>
                </button>
            ))}
        </nav>
    )
}

export default TabBar
