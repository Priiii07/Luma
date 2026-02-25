import { useState, useEffect } from 'react'

function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null)
    const [showPrompt, setShowPrompt] = useState(false)
    const [isInstalled, setIsInstalled] = useState(false)

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true)
            return
        }

        // Check if user previously dismissed
        const dismissed = localStorage.getItem('pwa-install-dismissed')
        if (dismissed) {
            const dismissedAt = parseInt(dismissed, 10)
            // Show again after 7 days
            if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return
        }

        function handleBeforeInstall(e) {
            e.preventDefault()
            setDeferredPrompt(e)
            setShowPrompt(true)
        }

        function handleAppInstalled() {
            setIsInstalled(true)
            setShowPrompt(false)
            setDeferredPrompt(null)
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstall)
        window.addEventListener('appinstalled', handleAppInstalled)

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
            window.removeEventListener('appinstalled', handleAppInstalled)
        }
    }, [])

    async function handleInstall() {
        if (!deferredPrompt) return
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === 'accepted') {
            setShowPrompt(false)
        }
        setDeferredPrompt(null)
    }

    function handleDismiss() {
        setShowPrompt(false)
        localStorage.setItem('pwa-install-dismissed', Date.now().toString())
    }

    if (isInstalled || !showPrompt) return null

    return (
        <div className="install-prompt">
            <div className="install-prompt-icon">
                <img src="/icons/icon-192.png" alt="App icon" width="40" height="40" />
            </div>
            <div className="install-prompt-text">
                <strong>Install Cycle Planner</strong>
                <span>Add to your home screen for quick access</span>
            </div>
            <div className="install-prompt-actions">
                <button onClick={handleInstall} className="install-prompt-btn install-prompt-btn-primary">
                    Install
                </button>
                <button onClick={handleDismiss} className="install-prompt-btn install-prompt-btn-dismiss">
                    Not Now
                </button>
            </div>
        </div>
    )
}

export default InstallPrompt
