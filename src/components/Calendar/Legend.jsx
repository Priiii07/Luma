function Legend() {
    const legendItems = [
        { color: '#ffccd5', label: '🟥 Menstrual (Low Energy)' },
        { color: '#ffe5b4', label: '🟧 Follicular (Medium Energy)' },
        { color: '#e0b0ff', label: '🟪 Ovulation (High Energy)' },
        { color: '#e5e5e5', label: '⬜ Luteal (Prep Week)' }
    ]

    return (
        <div className="flex gap-6 px-6 py-4 bg-gray-50 border-b border-gray-200 flex-wrap">
            {legendItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                    <div
                        className="w-5 h-5 rounded"
                        style={{ background: item.color }}
                    ></div>
                    <span>{item.label}</span>
                </div>
            ))}
        </div>
    )
}

export default Legend
