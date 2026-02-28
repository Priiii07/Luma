import { useState } from 'react'

export default function InsightBanner({ type, icon, message, action, dismissible }) {
    const [dismissed, setDismissed] = useState(false)

    if (dismissed) return null

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
                <button className="banner-dismiss" onClick={() => setDismissed(true)}>
                    ✕
                </button>
            )}
        </div>
    )
}
