import { useState, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import TaskCard from './TaskCard'

function TasksTab({ tasks, onTaskClick, onAddTask, onToggleComplete, isOnboarded }) {
    const [filter, setFilter] = useState('upcoming')
    const [searchQuery, setSearchQuery] = useState('')
    const [sortBy, setSortBy] = useState('date')

    const today = format(new Date(), 'yyyy-MM-dd')

    const ENERGY_ORDER = { high: 0, medium: 1, low: 2 }

    const filteredTasks = useMemo(() => {
        let filtered = [...tasks]

        // Apply filter
        switch (filter) {
            case 'today':
                filtered = filtered.filter(t => t.scheduledDate === today)
                break
            case 'upcoming':
                filtered = filtered.filter(t => t.scheduledDate >= today && !t.completed)
                break
            case 'completed':
                filtered = filtered.filter(t => t.completed)
                break
            case 'all':
            default:
                break
        }

        // Apply search
        if (searchQuery) {
            const q = searchQuery.toLowerCase()
            filtered = filtered.filter(t => t.name?.toLowerCase().includes(q))
        }

        // Sort
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'priority': {
                    const ea = ENERGY_ORDER[a.energyLevel] ?? 3
                    const eb = ENERGY_ORDER[b.energyLevel] ?? 3
                    if (ea !== eb) return ea - eb
                    return (a.scheduledDate || '').localeCompare(b.scheduledDate || '')
                }
                case 'name':
                    return (a.name || '').localeCompare(b.name || '')
                case 'date':
                default:
                    return (a.scheduledDate || '').localeCompare(b.scheduledDate || '')
            }
        })

        return filtered
    }, [tasks, filter, searchQuery, sortBy, today])

    // Group by date
    const grouped = useMemo(() => {
        const groups = {}
        filteredTasks.forEach(task => {
            let groupKey
            if (sortBy === 'priority') {
                groupKey = task.energyLevel ? task.energyLevel.toUpperCase() + ' ENERGY' : 'NO ENERGY SET'
            } else if (sortBy === 'name') {
                groupKey = (task.name?.[0] || '#').toUpperCase()
            } else {
                groupKey = task.scheduledDate || 'Unscheduled'
            }
            if (!groups[groupKey]) groups[groupKey] = []
            groups[groupKey].push(task)
        })
        return groups
    }, [filteredTasks, sortBy])

    const formatDateHeader = (dateStr) => {
        if (sortBy !== 'date') return dateStr
        if (dateStr === 'Unscheduled') return 'UNSCHEDULED'
        if (dateStr === today) return 'TODAY'

        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        if (dateStr === format(tomorrow, 'yyyy-MM-dd')) return 'TOMORROW'

        try {
            return format(parseISO(dateStr), 'EEEE, MMMM d').toUpperCase()
        } catch {
            return dateStr
        }
    }

    const filters = [
        { key: 'today', label: 'Today' },
        { key: 'upcoming', label: 'Upcoming' },
        { key: 'all', label: 'All' },
        { key: 'completed', label: 'Done' }
    ]

    const sortOptions = [
        { key: 'date', label: 'Date' },
        { key: 'priority', label: 'Priority' },
        { key: 'name', label: 'A-Z' }
    ]

    return (
        <div className="tasks-tab">
            {/* Filter bar + sort */}
            <div className="tasks-toolbar">
                <div className="tasks-filter-bar">
                    {filters.map(f => (
                        <button
                            key={f.key}
                            className={`tasks-filter-btn ${filter === f.key ? 'active' : ''}`}
                            onClick={() => setFilter(f.key)}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
                <div className="tasks-sort">
                    <label className="tasks-sort-label">Sort:</label>
                    <select
                        className="tasks-sort-select"
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                    >
                        {sortOptions.map(s => (
                            <option key={s.key} value={s.key}>{s.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Search */}
            <div className="tasks-search">
                <input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Task list */}
            <div className="tasks-list">
                {Object.keys(grouped).length === 0 ? (
                    <div className="tasks-empty">
                        <span className="tasks-empty-icon">📭</span>
                        <p>No tasks found</p>
                        {isOnboarded && (
                            <button className="home-add-btn" onClick={onAddTask} style={{ marginTop: '12px' }}>+ Add Task</button>
                        )}
                    </div>
                ) : (
                    Object.keys(grouped).map(groupKey => (
                        <div key={groupKey} className="tasks-date-group">
                            <div className="tasks-date-header">
                                {formatDateHeader(groupKey)}
                            </div>
                            {grouped[groupKey].map(task => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    onTaskClick={onTaskClick}
                                    onToggleComplete={onToggleComplete}
                                />
                            ))}
                        </div>
                    ))
                )}
            </div>

            {/* FAB for mobile */}
            {isOnboarded && (
                <button className="fab-add-task" onClick={onAddTask}>+</button>
            )}
        </div>
    )
}

export default TasksTab
