import { useState, useEffect, useRef } from 'react'

function isIOSDevice() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent))
}

function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true
}

function wasDismissedRecently() {
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (!dismissed) return false
    const dismissedAt = parseInt(dismissed, 10)
    return Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000
}

function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null)
    const promptReceivedRef = useRef(false)
    const [isInstalled, setIsInstalled] = useState(isStandalone)
    const [isIOS] = useState(isIOSDevice)
    const [showPrompt, setShowPrompt] = useState(() => {
        if (isStandalone() || wasDismissedRecently()) return false
        // iOS: show immediately since beforeinstallprompt never fires
        if (isIOSDevice()) return true
        return false
    })

    useEffect(() => {
        if (isInstalled || isIOS || wasDismissedRecently()) return

        function handleBeforeInstall(e) {
            e.preventDefault()
            promptReceivedRef.current = true
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

        // Fallback: if beforeinstallprompt hasn't fired after 3s, show generic prompt
        const fallbackTimer = setTimeout(() => {
            if (!promptReceivedRef.current) {
                setShowPrompt(true)
            }
        }, 3000)

        return () => {
            clearTimeout(fallbackTimer)
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
            window.removeEventListener('appinstalled', handleAppInstalled)
        }
    }, [isInstalled, isIOS])

    async function handleInstall() {
        if (deferredPrompt) {
            deferredPrompt.prompt()
            const { outcome } = await deferredPrompt.userChoice
            if (outcome === 'accepted') {
                setShowPrompt(false)
            }
            setDeferredPrompt(null)
        }
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
                <strong>Install Luma</strong>
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
