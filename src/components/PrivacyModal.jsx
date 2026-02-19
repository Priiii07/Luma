function PrivacyModal({ isOpen, onClose }) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto">
                <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl">
                    <h2 className="text-lg font-semibold text-gray-800">Privacy Policy</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                    >
                        &times;
                    </button>
                </div>

                <div className="px-6 py-6 space-y-5 text-sm text-gray-700">
                    <section>
                        <h3 className="font-semibold text-gray-900 mb-1">Your Data Stays on Your Device</h3>
                        <p>
                            Cycle-Aware Planner stores all your data locally in your browser using IndexedDB.
                            Your cycle dates, tasks, and preferences never leave your device.
                        </p>
                    </section>

                    <section>
                        <h3 className="font-semibold text-gray-900 mb-1">No Tracking or Analytics</h3>
                        <p>
                            We do not use cookies, analytics tools, or any form of user tracking.
                            There are no third-party scripts collecting your information.
                        </p>
                    </section>

                    <section>
                        <h3 className="font-semibold text-gray-900 mb-1">No Account Required</h3>
                        <p>
                            You don't need to create an account or sign in. There's no server storing
                            your data — everything runs entirely in your browser.
                        </p>
                    </section>

                    <section>
                        <h3 className="font-semibold text-gray-900 mb-1">Data Backup</h3>
                        <p>
                            Since data is stored locally, clearing your browser data will remove it.
                            Use the Export feature in Settings to create a JSON backup you can restore later.
                        </p>
                    </section>

                    <section>
                        <h3 className="font-semibold text-gray-900 mb-1">Beta Notice</h3>
                        <p>
                            This app is currently in beta. We recommend exporting backups regularly.
                            If you encounter any issues, please use the feedback button to let us know.
                        </p>
                    </section>

                    <div className="pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-400">
                            Last updated: February 2026
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PrivacyModal
