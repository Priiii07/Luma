function PrivacyModal({ isOpen, onClose }) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
                 style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                <div className="px-6 py-5 flex justify-between items-center sticky top-0 rounded-t-2xl"
                     style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Privacy Policy</h2>
                    <button
                        onClick={onClose}
                        className="text-2xl leading-none"
                        style={{ color: 'var(--text-tertiary)' }}
                    >
                        &times;
                    </button>
                </div>

                <div className="px-6 py-6 space-y-5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <section>
                        <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Your Data Stays on Your Device</h3>
                        <p>
                            Cycle-Aware Planner stores all your data locally in your browser using IndexedDB.
                            Your cycle dates, tasks, and preferences never leave your device.
                        </p>
                    </section>

                    <section>
                        <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No Tracking or Analytics</h3>
                        <p>
                            We do not use cookies, analytics tools, or any form of user tracking.
                            There are no third-party scripts collecting your information.
                        </p>
                    </section>

                    <section>
                        <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No Account Required</h3>
                        <p>
                            You don't need to create an account or sign in. There's no server storing
                            your data — everything runs entirely in your browser.
                        </p>
                    </section>

                    <section>
                        <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Data Backup</h3>
                        <p>
                            Since data is stored locally, clearing your browser data will remove it.
                            Use the Export feature in Settings to create a JSON backup you can restore later.
                        </p>
                    </section>

                    <section>
                        <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Beta Notice</h3>
                        <p>
                            This app is currently in beta. We recommend exporting backups regularly.
                            If you encounter any issues, please use the feedback button to let us know.
                        </p>
                    </section>

                    <div className="pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            Last updated: February 2026
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PrivacyModal
