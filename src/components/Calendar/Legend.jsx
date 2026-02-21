function Legend() {
    const legendItems = [
        { color: 'var(--phase-menstrual)', border: 'var(--phase-menstrual-border)', label: '🟥 Menstrual (Low Energy)' },
        { color: 'var(--phase-follicular)', border: 'var(--phase-follicular-border)', label: '🟧 Follicular (Medium Energy)' },
        { color: 'var(--phase-ovulation)', border: 'var(--phase-ovulation-border)', label: '🟪 Ovulation (High Energy)' },
        { color: 'var(--phase-luteal)', border: 'var(--phase-luteal-border)', label: '⬜ Luteal (Prep Week)' }
    ]

    return (
        <div
            className="flex gap-6 px-6 py-4 flex-wrap"
            style={{
                background: 'rgba(255,255,255,0.02)',
                borderBottom: '1px solid var(--border-subtle)'
            }}
        >
            {legendItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <div
                        className="w-5 h-5 rounded"
                        style={{ background: item.color, border: `1px solid ${item.border}` }}
                    ></div>
                    <span>{item.label}</span>
                </div>
            ))}
        </div>
    )
}

export default Legend
