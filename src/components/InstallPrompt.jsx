import { useState, useEffect } from 'react'

function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null)
    const [showPrompt, setShowPrompt] = useState(false)
    const [isInstalled, setIsInstalled] = useState(false)
    const [isIOS, setIsIOS] = useState(false)

    useEffect(() => {
        // Check if already installed (standalone mode)
        if (window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone === true) {
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

        // Detect iOS (Safari doesn't support beforeinstallprompt)
        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

        if (isIOSDevice) {
            setIsIOS(true)
            setShowPrompt(true)
            return
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

        // For Android/Chrome: if beforeinstallprompt hasn't fired after 3s,
        // show a generic prompt anyway (the event may have fired before React mounted)
        const fallbackTimer = setTimeout(() => {
            if (!deferredPrompt) {
                setShowPrompt(true)
            }
        }, 3000)

        return () => {
            clearTimeout(fallbackTimer)
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
            window.removeEventListener('appinstalled', handleAppInstalled)
        }
    }, [])

    async function handleInstall() {
        if (deferredPrompt) {
            deferredPrompt.prompt()
            const { outcome } = await deferredPrompt.userChoice
            if (outcome === 'accepted') {
                setShowPrompt(false)
            }
            setDeferredPrompt(null)
        }
        // If no deferredPrompt (iOS or fallback), the button text will guide the user
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
                {isIOS ? (
                    <span>
                        Tap <span style={{ fontSize: '1.1em' }}>⎙</span> Share then "Add to Home Screen"
                    </span>
                ) : deferredPrompt ? (
                    <span>Add to your home screen for quick access</span>
                ) : (
                    <span>Use your browser menu to "Add to Home Screen"</span>
                )}
            </div>
            <div className="install-prompt-actions">
                {deferredPrompt && (
                    <button onClick={handleInstall} className="install-prompt-btn install-prompt-btn-primary">
                        Install
                    </button>
                )}
                <button onClick={handleDismiss} className="install-prompt-btn install-prompt-btn-dismiss">
                    {deferredPrompt ? 'Not Now' : 'Got It'}
                </button>
            </div>
        </div>
    )
}

export default InstallPrompt
