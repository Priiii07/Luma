import { useState } from 'react'
import { getPhaseEnergyLabel } from '../utils/backlogFilters'

const TIME_OPTIONS = [
    { value: 15, label: '15 minutes', icon: '⚡' },
    { value: 30, label: '30 minutes', icon: '⏱' },
    { value: 60, label: '1 hour', icon: '⌚' },
    { value: 120, label: '2+ hours', icon: '📅' }
]

const PHASE_DESCRIPTIONS = {
    menstrual: 'Rest & low effort',
    follicular: 'Building up energy',
    ovulation: 'Peak performance',
    luteal: 'Steady focus'
}

function TimePickerModal({ currentPhase, onSubmit, onClose }) {
    const [selectedTime, setSelectedTime] = useState(60)

    const recommendedEnergy = getPhaseEnergyLabel(currentPhase)
    const phaseLabel = currentPhase
        ? currentPhase.charAt(0).toUpperCase() + currentPhase.slice(1)
        : 'Unknown'
    const phaseDesc = PHASE_DESCRIPTIONS[currentPhase] || ''

    return (
        <div className="tpm-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
            <div className="tpm-modal">
                <div className="tpm-header">
                    <h2>How much time do you have?</h2>
                    <button className="tpm-close" onClick={onClose}>✕</button>
                </div>

                <div className="tpm-body">
                    <div className="tpm-time-grid">
                        {TIME_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                className={`tpm-time-option ${selectedTime === opt.value ? 'selected' : ''}`}
                                onClick={() => setSelectedTime(opt.value)}
                            >
                                <span className="tpm-option-icon">{opt.icon}</span>
                                <span className="tpm-option-label">{opt.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="tpm-phase-info">
                        <div className="tpm-phase-row">
                            <span className="tpm-phase-name">📊 {phaseLabel} phase</span>
                            {phaseDesc && <span className="tpm-phase-desc">{phaseDesc}</span>}
                        </div>
                        <p className="tpm-phase-rec">
                            Best for: <strong>{recommendedEnergy} energy</strong> tasks
                        </p>
                    </div>
                </div>

                <div className="tpm-footer">
                    <button className="tpm-btn-ghost" onClick={onClose}>Cancel</button>
                    <button className="tpm-btn-primary" onClick={() => onSubmit(selectedTime)}>
                        Show me tasks →
                    </button>
                </div>
            </div>
        </div>
    )
}

export default TimePickerModal
