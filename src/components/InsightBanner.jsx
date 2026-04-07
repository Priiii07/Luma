import { useState } from 'react'

// Dismissed banners stay hidden for 7 days
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000

function wasDismissedRecently(type) {
    try {
        const stored = localStorage.getItem(`banner_dismissed_${type}`)
        if (!stored) return false
        return Date.now() - parseInt(stored, 10) < DISMISS_TTL_MS
    } catch {
        return false
    }
}

function persistDismissal(type) {
    try {
        localStorage.setItem(`banner_dismissed_${type}`, Date.now().toString())
    } catch { /* ignore */ }
}

export default function InsightBanner({ type, icon, message, action, dismissible }) {
    const [dismissed, setDismissed] = useState(() => wasDismissedRecently(type))

    if (dismissed) return null

    const handleDismiss = () => {
        persistDismissal(type)
        setDismissed(true)
    }

    return (
        <div className={`insight-banner ${type}`}>
            <span className="banner-icon">{icon}</span>
            <div className="banner-content">
                <p className="banner-message">{message}</p>
                {action && (
                    <button className="banner-action" onClick={action.onClick}>
                        {action.label}
                    </button>
                )}
            </div>
            {dismissible && (
                <button className="banner-dismiss" onClick={handleDismiss}>
                    ✕
                </button>
            )}
        </div>
    )
}
