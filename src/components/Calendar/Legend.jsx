function Legend() {
    const legendItems = [
        { color: 'var(--phase-menstrual)', border: 'var(--phase-menstrual-border)', label: 'Menstrual', fullLabel: 'Menstrual (Low Energy)' },
        { color: 'var(--phase-follicular)', border: 'var(--phase-follicular-border)', label: 'Follicular', fullLabel: 'Follicular (Medium Energy)' },
        { color: 'var(--phase-ovulation)', border: 'var(--phase-ovulation-border)', label: 'Ovulation', fullLabel: 'Ovulation (High Energy)' },
        { color: 'var(--phase-luteal)', border: 'var(--phase-luteal-border)', label: 'Luteal', fullLabel: 'Luteal (Prep Week)' }
    ]

    return (
        <div
            className="grid grid-cols-2 md:flex gap-2 md:gap-6 px-3 md:px-6 py-2 md:py-4 md:flex-wrap"
            style={{
                background: 'var(--surface-1)',
                borderBottom: '1px solid var(--border-subtle)'
            }}
        >
            {legendItems.map((item, index) => (
                <div key={index} className="flex items-center gap-1.5 md:gap-2 text-[11px] md:text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <div
                        className="w-3 h-3 md:w-5 md:h-5 rounded shrink-0"
                        style={{ background: item.color, border: `1px solid ${item.border}` }}
                    ></div>
                    <span className="md:hidden">{item.label}</span>
                    <span className="hidden md:inline">{item.fullLabel}</span>
                </div>
            ))}
        </div>
    )
}

export default Legend
